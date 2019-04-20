var citizen = require('supe'),
    create_task = require('cjs-task'),
    supe_addon_citizen_request = require('supe-addon-citizen-request'),

    app = create_task();

citizen.use( supe_addon_citizen_request );

app.set( 'citizen', citizen );
app.set( 'start-time', Date.now() );

require( './steps/create-redis-client' )( app );
require( './steps/log-redis-connection-lifecycle' )( app );

app.step( 'send redis subscription updates out as supe notices', function(){
  var redis = app.get( 'redis' );

  redis.on( 'message', function( channel, msg ){
    citizen.noticeboard.notify( citizen.get_name() + '-subscription-update', { channel: channel, msg: msg });
  });

  app.next();
});

app.step( 'setup command request handler', function(){
  var citizen = app.get( 'citizen' );

  citizen.request.handle( 'run-command', function( envelope, end_request ){
    var request = envelope.msg;
    if( ! 'command' in request ) return end_request( new Error( 'command to run not specified' ) );

    var command = request.data.command.shift().toLowerCase(),
        command_args = request.data.command;

    switch( command ){

      case 'multi':
        var handle_multi = create_task();

        handle_multi.set( 'redis', app.get( 'redis' ) );

        handle_multi.step( 'dissect args into multiple commands', function(){
          var multi_commands = [],
              current_multi_command;

          for( var i = 0; i < command_args.length; i += 1 ){
            var item = command_args[ i ];

            switch( Object.prototype.toString.call( current_multi_command ) ){

              case '[object Array]':
                if( item !== '---multi-separator---' ) current_multi_command.push( item );
                else {
                  if( current_multi_command.length < 1 ) throw new Error( 'unexpected empty command in multi' );

                  multi_commands.push( current_multi_command );
                  current_multi_command = undefined;
                }
              break;

              case '[object Undefined]':
                if( item === '---multi-separator---' ) current_multi_command = [];
                else throw new Error( 'unexpected command structure. expected=---multi-separator--- received=' + item );
              break;

              default:
                throw new Error( 'unexpected multi parse state' );
              break;
            }
          }

          if( current_multi_command ) throw new Error( 'unexpected command structure. parse completed in incorrect state' );
          if( multi_commands.length < 1 ) throw new Error( 'no commands in multi' );

          handle_multi.set( 'commands', multi_commands );
          handle_multi.next();
        });

        handle_multi.step( 'initiate multi', function(){
          var redis = handle_multi.get( 'redis' ),
              multi = redis.multi();

          handle_multi.set( 'multi', multi );
          handle_multi.next();
        });

        handle_multi.step( 'send each command in multi', function(){
          var commands = handle_multi.get( 'commands' ),
              multi = handle_multi.get( 'multi' );

          commands.forEach( function( struct ){
            var command = struct.shift().toLowerCase(),
                command_args = struct;

            multi = multi[ command ].apply( multi, command_args );
          });

          multi.exec( function( error, results ){
            if( error ) return handle_multi.end( error );

            handle_multi.set( 'results', results );
            handle_multi.next();
          });
        });

        handle_multi.callback( function( error ){
          if( error ) end_request( error );
          else end_request( null, handle_multi.get( 'results' ) );
        });

        handle_multi.start();
      break;

      default:
        send_command_to_redis( command, command_args, end_request );
      break;
    }

    function send_command_to_redis( cmd, args, callback ){
      try {
        if( arguments.length == 2 ){
          callback = args;
          args = [];
        }

        if( ! cmd ) throw new Error( 'no command specified' );

        var redis = app.get( 'redis' );
        if( ! redis[ cmd ] ) throw new Error( 'redis.' + command + ' not found on connection api' );
        if( typeof redis[ cmd ] !== 'function' ) throw new Error( 'redis.' + command + ' is not a function' );

        // transform api args to redis client args format
          args.push( callback );

        // send request to redis server
          redis[ command ].apply( redis, args );
      }

      catch( error ) {
        callback( error );
      }
    }
  });

  app.next();
});

app.step( 'log setup complete', function(){
  console.log( 'action=setup-complete duration=' + ( Date.now() - app.get( 'start-time' ) ) + 'ms' );
  app.next();
});

app.step( 'start processing requests', function(){
  var citizen = app.get( 'citizen' );

  console.log( 'action=start-processing-requests' );
  citizen.mail.receive();
});

app.callback( function( error ){
  if( error ) console.log( error );
  process.exit( error ? 1 : 0 );
});

app.start();
var path = require('path'),
    path_to_redis_citizen = path.join( __dirname, '/../citizen' ),
    path_to_redis_citizen_api = path.join( __dirname, '/../api' );

module.exports = function( task, config ){
  if( ! config ) config = {};

  var redis_citizen_name = 'redis_citizen_name' in config ? config.redis_citizen_name : 'redis';

  task.step( 'start redis citizen', function(){
    var citizen = task.get( 'citizen' );

    citizen.supervisor.start( redis_citizen_name, path_to_redis_citizen, function( error ){
      if( error ) return task.end( error );
      else task.next();
    });
  });

  task.step( 'configure redis api', function(){
    var citizen = task.get( 'citizen' ),
        redis_api = require( path_to_redis_citizen_api ),
        redis_api_instance = redis_api( citizen, redis_citizen_name );

    task.set( 'redis', redis_api_instance );
    task.next();
  });
}
module.exports = function( citizen, redis_citizen_name ) {
  if( ! citizen ) throw new Error( 'citizen instance required to create api' );
  if( ! redis_citizen_name ) redis_citizen_name = 'redis';

  return send_request;

  function send_request(){
    var args = Array.prototype.slice.call( arguments ),
        callback = typeof args[ args.length - 1 ] == 'function' ? args.pop() : default_callback;

    citizen.request.send( redis_citizen_name, 'run-command', { command: args }, callback );

    function default_callback( error, data ){
      var log_entry = 'action=run-redis-command success=';

      if( error ){
        log_entry += 'false reason="'+ error.message +'" command=';
        console.log( log_entry, args );
      }

      else{
        log_entry += 'true';
        console.log( log_entry, 'response=', data, 'command=', args );
      }
    }
  }
}
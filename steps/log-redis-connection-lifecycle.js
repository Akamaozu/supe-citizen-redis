module.exports = function( task, config ){
  if( ! config ) config = {};

  task.step( 'log redis connection lifecycle', function(){
    var redis = task.get( 'redis' );

    redis.on( 'ready', () => console.log( 'action=redis-connect' ) );
    redis.on( 'end', () => console.log( 'action=redis-disconnect' ) );
    redis.on( 'error', ( error ) => console.log( 'action=redis-connection-error error=', error ) );

    task.next();
  });
}
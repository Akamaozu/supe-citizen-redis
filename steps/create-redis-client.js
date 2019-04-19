var redis = require('redis');

module.exports = function( task, config ){
  if( ! config ) config = {};

  var redis_url = config.url || process.env.REDIS_URL;
  if( ! redis_url ) throw new Error( 'redis url not given' );

  task.step( 'connect to redis server', function(){
    var redis_client = redis.createClient({ url: redis_url });

    task.set( 'redis', redis_client );
    task.next();
  });
}

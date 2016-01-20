var orbit   = await (OrbitClient.connect(host, username, password));
var head    = await (orbit.channel(channelName, channelPwd).send('hello world'));
var iter    = await (orbit.channel(channelName, channelPwd).iterator());
var next    = iter.next();
var deleted = await (orbit.channel(channelName, channelPwd).delete());
var modes   = await (orbit.channel(channelName, channelPwd).setMode({mode: '+r', params: 'password': '123' }));

// Pubsub
await (orbit.channel(channelName, channelPwd).subscribe(onMessage));
var head = await (orbit.channel(channelName, channelPwd).publish('hello world'));



orbit.connect(host, username, password)

orbit.channels.list() // { 'ch1':{...}, 'ch2': {...} }
orbit.channels.join('ch3', password)
orbit.channels.leave('ch3')
orbit.channels.onMessage(callback)

orbit.publish('ch3', 'hello!')

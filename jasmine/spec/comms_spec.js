var Strophe = require('./support/mock_strophe.js')
var proxyquire = require('proxyquireify')(require);
var stubs = { 
  './deps/strophe.js': Strophe,
  './deps/strophe.muc.js': {}
};

var XmppComms = proxyquire('../../app/comms.js', stubs);

describe("XmppComms", function() {

  var comms;

  beforeEach(function() {
    comms = Object.create(XmppComms);
  });

  describe('#init', function() {
    describe('when the connection does not exist',function() {
      it('initializes it', function() {
        expect(comms.connection).toBeNull();
        comms.init();
        expect(comms.connection.connect).toBeDefined();
      });

      it('sets boshservice', function() {
        comms.init();
        expect(comms.connection.boshService).toBe(comms.boshServiceUrl());
      });
    });

    describe('when the connection exists',function() {
      it('resets it', function() {
        var fakeConnectionSpy = jasmine.createSpyObj('fake_connection', ['reset']);
        comms.connection = fakeConnectionSpy;
        comms.init();
        expect(fakeConnectionSpy.reset).toHaveBeenCalled();
      });
    });
  });

  describe('#registerCallbacks', function() {

    it('sets the onConnected, onDisconnected and onMessage callbacks', function() {
      var onConnectedSpy = jasmine.createSpy('onConnectedSpy');
      var onDisconnectedSpy = jasmine.createSpy('onDisconnectedSpy');
      var onMessageSpy = jasmine.createSpy('onMessageSpy');

      comms.registerCallbacks(onConnectedSpy, onDisconnectedSpy, onMessageSpy);
      expect(comms.onConnectedCb).toBe(onConnectedSpy);
      expect(comms.onDisconnectedCb).toBe(onDisconnectedSpy);
      expect(comms.onMessageCb).toBe(onMessageSpy);
    });
  });

  describe('#connect', function() {
    beforeEach(function() {
      comms.init();
    });

    it("sets the username, password, rooom", function() {
      comms.connect('fakeuser1', 'fakepass1', 'fakeroom1');
      expect(comms.username).toBe('fakeuser1');
      expect(comms.password).toBe('fakepass1');
      expect(comms.room).toBe('fakeroom1');
    });


    describe('establishes a connection', function(){
      it('sets jid and password on the connection object', function() {
        comms.connect('fakeuser', 'fakepass', 'fakeroom');
        expect(comms.connection.jid).toBe(comms.jid());
        expect(comms.connection.password).toBe(comms.password);
      });

      it('sets the onServerConnect callback on the connection object',function() {
        spyOn(comms, 'onServerConnect');
        comms.connect('fakeuser', 'fakepass', 'fakeroom');
        //we call comms.connection.onConnectCb and check if the callback, onServerConnect was called
        //we cannot check the function directly because it was wrapped in a `bind` call
        comms.connection.onConnectCb();
        expect(comms.onServerConnect).toHaveBeenCalled();
      })
    });
  });

  describe('#onMessage', function() {
    var onMessageCb;

    var message = null;
    var body = "Don't Tell 'Em";
    var sender = 'sillylogger';

    beforeEach(function() {
      onMessageCb = jasmine.createSpy('onMessageCb');
      comms.setOnMessageCb(onMessageCb);
    });

    it('parses the message and passes that to the onMessageCb', function() {
      var data = `<message  xmlns="jabber:client"
                            type="groupchat"
                            to="aaf868ec-d5d1-43e9-ab9a-20662abd8d52@chatyuk.com/84e99860-e518-4f63-be89-4c9a11c2bdaa"
                            from="vip@conference.chatyuk.com/${sender}"
                            id="1">
                    <body>${body}</body>
                    <x xmlns="jabber:x:event">
                      <composing/>
                    </x>
                  </message>`;

      message = new DOMParser().parseFromString(data, "text/xml").documentElement;

      comms.onMessage(message);
      expect(onMessageCb).toHaveBeenCalled();

      var args = onMessageCb.calls.mostRecent().args[0];
      expect(args.body).toEqual(body);
      expect(args.sender).toEqual(sender);
    });

  });

  describe('#roomAndServer', function() {
    it('combines generates the room JID',function() {
      var comms = Object.create(XmppComms);
      comms.init();
      comms.connect('fakeuser', 'fakepass', 'fakeroom');
      expect(comms.roomAndServer()).toBe('fakeroom@'+XmppComms.CONFERENCE_SERVER);
    })
  });

  describe('currentStatus', function() {
    it('is null by default',function() {
      var comms = Object.create(XmppComms);
      comms.init();
      comms.connect('fakeuser', 'fakepass', 'fakeroom');
      expect(comms.currentStatus).toBe(null);
    })
  });

  describe('#isConnected', function(){
    beforeEach(function() {
      comms.init();
      comms.connect('fakeuser', 'fakepass', 'fakeroom');
    });
    describe('when currentStatus is CONNECTED', function() {
      it('returns true', function() {
        comms.onServerConnect(Strophe.Status.CONNECTED);
        expect(comms.isConnected()).toBe(true);
      });
    });

    describe('when currentStatus is ATTACHED', function() {
      it('returns true', function() {
        comms.onServerConnect(Strophe.Status.ATTACHED);
        expect(comms.isConnected()).toBe(true);
      });
    });

    describe('for all other states', function() {
      it('returns false', function() {
        expect(comms.isConnected()).toBe(false);
        comms.onServerConnect(Strophe.Status.CONNECTING);
        expect(comms.isConnected()).toBe(false);
        comms.onServerConnect(Strophe.Status.DISCONNECTED);
        expect(comms.isConnected()).toBe(false);
      });
    });
  });

  describe('#onServerConnect', function() {

    beforeEach(function(){
      comms.init();
      comms.connect('fakeuser', 'fakepass', 'fakeroom');
    });

    it('sets the currentStatus',function() {
      comms.onServerConnect(Strophe.Status.CONNECTING);
      expect(comms.currentStatus).toBe(Strophe.Status.CONNECTING);
      comms.onServerConnect(Strophe.Status.DISCONNECTED);
      expect(comms.currentStatus).toBe(Strophe.Status.DISCONNECTED);
    })

    describe('when status is CONNECTED',function() {
      it('joins the specified room', function() {
        mucSpy = spyOn(comms.connection.muc,'join');
        comms.onServerConnect(Strophe.Status.CONNECTED);
        expect(mucSpy).toHaveBeenCalledWith(comms.roomAndServer(),
                                            comms.username,
                                            //need to do this because onMessage is having bind(this) called on it and it writtens a wrapped function - need to figureout a better way to test these type of cases
                                            jasmine.any(Function),
                                            comms.log,
                                            comms.log
                                           );
      });
    });
  });
});

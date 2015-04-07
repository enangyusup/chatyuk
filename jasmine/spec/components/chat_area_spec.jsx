var React  = require('react/addons');
var ChatArea = require('../../../app/components/chat_area.jsx');
var OnPageChatBox = require('../../../app/components/on_page_chat_box.jsx');
var InPageChatBox = require('../../../app/components/in_page_chat_box.jsx');

var instance;
var TestUtils = React.addons.TestUtils;

var commsStub = {isConnected: function() {false}, registerCallbacks: function() {} };

var triggerWindowUnload = function() {
  var event = new PageTransitionEvent('unload', {
    'view': window,
    'bubbles': true,
    'cancelable': true
  });
  window.dispatchEvent(event);
}

describe("ChatArea", function() {
  describe('logout', function() {

    beforeEach(function() {
      jasmineReact.spyOnClass(ChatArea,'render').and.returnValue(<div/>);
    });

    describe('when logged in', function() {
      it('calls comms.disconnect', function() {
        var disconnectSpy = jasmine.createSpy('disconnect'); 
        var loggedInCommsStub =  {isConnected: function() {return true}, registerCallbacks: function() {}, disconnect: disconnectSpy, username: 'test', room: 'test' };
        instance = TestUtils.renderIntoDocument(<ChatArea comms={loggedInCommsStub} config={{}} />);
        instance.logout();
        expect(disconnectSpy).toHaveBeenCalled();
      });

    });

    describe('when logged out', function() {
      it('does not call comms.disconnect', function() {
        
        var disconnectSpy = jasmine.createSpy('disconnect'); 
        var loggedOutCommsStub =  {isConnected: function() {return false}, registerCallbacks: function() {} , disconnect: disconnectSpy  };
        instance = TestUtils.renderIntoDocument(<ChatArea comms={loggedOutCommsStub} config={{}} />);
        instance.logout();
        expect(disconnectSpy).not.toHaveBeenCalled();
        
      });
    });

  });

  describe('componentWillUnmount', function() {
    it('unattaches the window.unload event', function() {
      var unloadingSpy = jasmineReact.spyOnClass(ChatArea,'unloading');
      instance = TestUtils.renderIntoDocument(<ChatArea comms={commsStub} config={{}} />);
      instance.unmountComponent();
      triggerWindowUnload();
      expect(unloadingSpy).not.toHaveBeenCalled();
    });
  });

  describe('componentDidMount', function() {
    it('attaches logout to the window.unload event', function() {
      var unloadingSpy = jasmineReact.spyOnClass(ChatArea,'unloading');
      instance = TestUtils.renderIntoDocument(<ChatArea comms={commsStub} config={{}} />);
      triggerWindowUnload();
      expect(unloadingSpy).toHaveBeenCalled();
    });

    it('registers this.updateState as onConnected and onDisconnected callbacks ', function() {
      //var updateStateSpy = jasmineReact.spyOnClass(ChatArea,'updateState');
      var registerCallbacksSpy = spyOn(commsStub, 'registerCallbacks');
      instance = TestUtils.renderIntoDocument(<ChatArea comms={commsStub} config={{}} />);
      expect(registerCallbacksSpy).toHaveBeenCalledWith(jasmine.any(Function), jasmine.any(Function));
    });
  });




  describe('chatBoxClass', function(){
    describe('when config.display_mode is set to "inpage"', function(){
      it('returns InPageChatBox', function() {
        var config = { display_mode: 'inpage'};
        instance = TestUtils.renderIntoDocument(<ChatArea comms={commsStub} config={config} />);
        expect(instance.chatBoxClass()).toEqual(InPageChatBox);
      });
    });

    describe('when config.display_mode is set to "onpage"', function(){
      it('renders the onpage version of the ChatArea', function() {
        var config = { display_mode: 'onpage'};
        instance = TestUtils.renderIntoDocument(<ChatArea comms={commsStub} config={config} />);
        expect(instance.chatBoxClass()).toEqual(OnPageChatBox);
      });
    });
  });

  describe('render',function() {
    it('renders the type returned chatBoxClass', function() {
      var chatBoxClassSpy = jasmineReact.spyOnClass(ChatArea,'chatBoxClass').and.returnValue(OnPageChatBox);

      instance = TestUtils.renderIntoDocument(<ChatArea comms={commsStub} />);
      expect(TestUtils.findRenderedComponentWithType(instance, OnPageChatBox)).toBeDefined();

      chatBoxClassSpy.and.returnValue(InPageChatBox);

      instance = TestUtils.renderIntoDocument(<ChatArea comms={commsStub} />);
      expect(TestUtils.findRenderedComponentWithType(instance, InPageChatBox)).toBeDefined();
    });
  });

});

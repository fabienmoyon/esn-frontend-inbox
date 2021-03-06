'use strict';

/* global chai, sinon, _: false */

const { expect } = chai;

describe('The linagora.esn.unifiedinbox Main module directives', function() {

  var $compile, $rootScope, $scope, $timeout, $templateCache, element, jmapClient, inboxPlugins,
    iFrameResize = angular.noop, elementScrollService, $stateParams, $dropdown,
    isMobile, searchService, windowMock, fakeNotification,
    sendEmailFakePromise, inboxConfigMock, inboxJmapItemService, INBOX_EVENTS,
    $httpBackend, inboxCustomRoleMailboxService;

  beforeEach(function() {
    angular.module('esn.iframe-resizer-wrapper', []);
    angular.mock.module('esn.ui');
    angular.mock.module('esn.core');
    angular.mock.module('esn.session');
    angular.mock.module('esn.configuration');
    angular.mock.module('esn.dropdownList');
    angular.mock.module('esn.previous-page');
    angular.mock.module('ngTagsInput');
    angular.mock.module('linagora.esn.unifiedinbox');
    angular.mock.module('esn.datetime', function($provide) {
      $provide.constant('ESN_DATETIME_DEFAULT_TIMEZONE', 'UTC');
    });
  });

  beforeEach(angular.mock.module(function($provide) {
    isMobile = false;
    windowMock = {
      open: sinon.spy()
    };
    inboxConfigMock = {};

    $provide.constant('MAILBOX_ROLE_ICONS_MAPPING', {
      testrole: 'testclass',
      default: 'defaultclass'
    });
    jmapClient = {};
    $provide.constant('withJmapClient', function(callback) {
      return callback(jmapClient);
    });
    $provide.provider('iFrameResize', {
      $get: function() {
        return iFrameResize;
      }
    });
    $provide.value('elementScrollService', elementScrollService = {
      autoScrollDown: sinon.spy(),
      scrollDownToElement: sinon.spy()
    });
    $provide.value('$dropdown', $dropdown = sinon.spy());
    $provide.decorator('$window', function($delegate) {
      return angular.extend($delegate, windowMock);
    });
    $provide.value('Fullscreen', {});
    $provide.value('ASTrackerController', {});
    $provide.value('deviceDetector', { isMobile: function() { return isMobile;} });
    $provide.value('searchService', searchService = { searchRecipients: angular.noop, searchByEmail: angular.noop });
    $provide.value('inboxConfig', function(key, defaultValue) {
      return $q.when(angular.isDefined(inboxConfigMock[key]) ? inboxConfigMock[key] : defaultValue);
    });

    fakeNotification = { update: function() {}, setCancelAction: sinon.spy() };
    $provide.value('notifyService', function() { return fakeNotification; });
    $provide.value('sendEmail', sinon.spy(function() { return sendEmailFakePromise; }));
    $provide.decorator('$state', function($delegate) {
      $delegate.go = sinon.spy();

      return $delegate;
    });
    $provide.value('inboxIdentitiesService', {
      getAllIdentities: function() {
        return $q.when([{ isDefault: true, id: 'default' }]);
      }
    });
  }));

  beforeEach(angular.mock.inject(function(_$compile_, _$rootScope_, _$timeout_, _$stateParams_, _$templateCache_, _$httpBackend_, session,
    _inboxJmapItemService_, _inboxPlugins_, _inboxCustomRoleMailboxService_, _INBOX_EVENTS_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    $timeout = _$timeout_;
    $stateParams = _$stateParams_;
    $templateCache = _$templateCache_;
    $httpBackend = _$httpBackend_;
    inboxJmapItemService = _inboxJmapItemService_;
    inboxPlugins = _inboxPlugins_;
    inboxCustomRoleMailboxService = _inboxCustomRoleMailboxService_;
    INBOX_EVENTS = _INBOX_EVENTS_;

    // in the mailbox-display we put a folder-settings component which use an icon provider that load this icon set
    // if this icon provider is moved somewhere else, this test will have to be moved as well probable.
    $httpBackend
      .whenGET('images/mdi/mdi.svg')
      .respond('');

    session.user = {
      preferredEmail: 'user@open-paas.org',
      emails: ['user@open-paas.org']
    };
  }));

  beforeEach(function() {
    $scope = $rootScope.$new();
  });

  afterEach(function() {
    if (element) {
      element.remove();
    }
  });

  function compileDirective(html, data) {
    element = angular.element(html);
    element.appendTo(document.body);

    if (data) {
      Object.keys(data).forEach(function(key) {
        element.data(key, data[key]);
      });
    }

    $compile(element)($scope);
    $scope.$digest();

    return element;
  }

  describe('The newComposer directive', function() {

    var newComposerService;

    beforeEach(angular.mock.inject(function(_newComposerService_) {
      newComposerService = _newComposerService_;
    }));

    it('should call the open fn from newComposerService when clicked', function() {
      var testee = compileDirective('<div new-composer/>');

      newComposerService.open = sinon.spy();

      testee.click();

      expect(newComposerService.open).to.have.been.calledOnce;
      expect(newComposerService.open).to.have.been.calledWith({});
    });

  });

  describe('The opInboxCompose directive', function() {

    var newComposerService, emailElement;

    beforeEach(angular.mock.inject(function(_newComposerService_) {
      newComposerService = _newComposerService_;
    }));

    it('should call the open fn when clicked on mailto link', function() {
      emailElement = compileDirective('<a ng-href="mailto:SOMEONE" op-inbox-compose op-inbox-compose-display-name="SOMETHING"/>');
      newComposerService.open = sinon.spy();

      emailElement.click();
      expect(newComposerService.open).to.have.been.calledWith({
        to: [{
          email: 'SOMEONE',
          name: 'SOMETHING'
        }]
      });
    });

    it('should call the open fn when put email in opInboxCompose attribute', function() {
      emailElement = compileDirective('<a op-inbox-compose="SOMEONE" op-inbox-compose-display-name="SOMETHING"/>');
      newComposerService.open = sinon.spy();

      emailElement.click();
      expect(newComposerService.open).to.have.been.calledWith({
        to: [{
          email: 'SOMEONE',
          name: 'SOMETHING'
        }]
      });
    });

    it('should call the preventDefault and stopPropagation fn when clicked on mailto link', function() {
      emailElement = compileDirective('<a op-inbox-compose ng-href="mailto:SOMEONE" op-inbox-compose-display-name="SOMETHING"/>');
      var event = {
        type: 'click',
        preventDefault: sinon.spy(),
        stopPropagation: sinon.spy()
      };

      emailElement.trigger(event);

      expect(event.preventDefault).to.have.been.called;
      expect(event.stopPropagation).to.have.been.called;
    });

    it('should not call the open fn when the link does not contain mailto', function() {
      emailElement = compileDirective('<a ng-href="tel:SOMEONE"/>');
      newComposerService.open = sinon.spy();

      emailElement.click();

      expect(newComposerService.open).to.have.not.been.called;
    });

    it('should not call the open fn when the link does not mailto and opInboxCompose attribute is undefined', function() {
      emailElement = compileDirective('<a op-inbox-compose />');
      newComposerService.open = sinon.spy();

      emailElement.click();

      expect(newComposerService.open).to.have.not.been.called;
    });

    it('should not call the open fn when the link does not mailto and opInboxCompose attribute is default', function() {
      emailElement = compileDirective('<a op-inbox-compose="op-inbox-compose" />');
      newComposerService.open = sinon.spy();

      emailElement.click();

      expect(newComposerService.open).to.have.not.been.called;
    });

    it('should call the open fn with correct email', function() {
      emailElement = compileDirective('<a ng-href="mailto:SOMEONE" op-inbox-compose="SOMEBODY" />');
      newComposerService.open = sinon.spy();

      emailElement.click();

      expect(newComposerService.open).to.have.been.calledWith({
        to: [{
          email: 'SOMEONE',
          name: 'SOMEONE'
        }]
      });
    });

    it('should it should use the email address as the display name if display name is not defined', function() {
      emailElement = compileDirective('<a op-inbox-compose ng-href="mailto:SOMEONE"/>');
      newComposerService.open = sinon.spy();

      emailElement.click();

      expect(newComposerService.open).to.have.been.calledWith({
        to: [{
          email: 'SOMEONE',
          name: 'SOMEONE'
        }]
      });
    });

    it('should call the open fn when clicked on mailto link with multiple mails', function() {
      emailElement = compileDirective('<a ng-href="mailto:SOMEONE1,SOMEONE2,SOMEONE3" op-inbox-compose/>');
      newComposerService.open = sinon.spy();

      emailElement.click();
      expect(newComposerService.open).to.have.been.calledWith({
        to: [{
          email: 'SOMEONE1',
          name: 'SOMEONE1'
        },
        {
          email: 'SOMEONE2',
          name: 'SOMEONE2'
        },
        {
          email: 'SOMEONE3',
          name: 'SOMEONE3'
        }]
      });
    });
  });

  describe('The mailboxDisplay directive', function() {

    it('should define $scope.mailboxIcons to default value if mailbox has no role', function() {
      $scope.mailbox = {
        role: {
          value: null
        },
        qualifiedName: 'test'
      };
      compileDirective('<mailbox-display mailbox="mailbox" />');

      expect(element.isolateScope().mailboxIcons).to.equal('defaultclass');
    });

    it('should define $scope.mailboxIcons to the correct value when mailbox has a role', function() {
      $scope.mailbox = {
        role: {
          value: 'testrole'
        },
        qualifiedName: 'test'
      };
      compileDirective('<mailbox-display mailbox="mailbox" />');

      expect(element.isolateScope().mailboxIcons).to.equal('testclass');
    });

    it('should define $scope.mailboxIcons to a custom one, if provided by a custom mailbox', function() {
      $scope.mailbox = {
        role: {
          value: 'custom role'
        },
        qualifiedName: 'test',
        icon: 'mdi-custom-icon'
      };
      compileDirective('<mailbox-display mailbox="mailbox" />');

      expect(element.isolateScope().mailboxIcons).to.equal('mdi-custom-icon');
    });

    it('should define $scope.mailboxIcons to registered icon in inboxCustomRoleMailboxService, if provided by a mailbox with custom role', function() {
      $scope.mailbox = {
        role: {
          value: 'custom role'
        },
        qualifiedName: 'test'
      };
      inboxCustomRoleMailboxService.getMailboxIcon = function() { return 'mdi-custom-icon'; };
      compileDirective('<mailbox-display mailbox="mailbox" />');

      expect(element.isolateScope().mailboxIcons).to.equal('mdi-custom-icon');
    });

    it('should define $scope.hideBadge to the correct value', function() {
      $scope.mailbox = {
        role: {
          value: null
        },
        qualifiedName: 'test'
      };
      compileDirective('<mailbox-display mailbox="mailbox" hide-badge=true />');

      expect(element.isolateScope().hideBadge).to.equal('true');
    });

    describe('The dragndrop feature', function() {

      var isolateScope;

      beforeEach(function() {
        $scope.mailbox = {
          id: '1',
          role: {
            value: 'testrole'
          },
          qualifiedName: 'test'
        };
        compileDirective('<mailbox-display mailbox="mailbox" />');

        isolateScope = element.isolateScope();
      });

      it('should be droppable element', function() {
        expect(element.attr('esn-droppable')).to.exist;
      });

      describe('The onDrop function', function() {
        var inboxJmapItemService;

        beforeEach(angular.mock.inject(function(_inboxJmapItemService_) {
          inboxJmapItemService = _inboxJmapItemService_;

          inboxJmapItemService.moveMultipleItems = sinon.spy(function() {
            return $q.when();
          });
        }));

        it('should delegate to inboxJmapItemService.moveMultipleItems', function() {
          var item1 = { id: 1 },
            item2 = { id: 2 };

          isolateScope.onDrop([item1, item2]);

          expect(inboxJmapItemService.moveMultipleItems).to.have.been.calledWith([item1, item2], $scope.mailbox);
        });

      });

      describe('The isDropZone function', function() {

        var inboxMailboxesService;

        beforeEach(angular.mock.inject(function(_inboxMailboxesService_) {
          inboxMailboxesService = _inboxMailboxesService_;
          inboxMailboxesService.canMoveMessage = sinon.spy(function() {
            return true;
          });
        }));

        it('should check result from inboxMailboxesService.canMoveMessage for a single item', function() {
          var item = {
            mailboxIds: ['2']
          };

          isolateScope.isDropZone([item]);

          expect(inboxMailboxesService.canMoveMessage).to.have.been.calledOnce;
          expect(inboxMailboxesService.canMoveMessage).to.have.been.calledWith(item, $scope.mailbox);
        });

        it('should check result from inboxMailboxesService.canMoveMessage for multiple items', function() {
          var item = {
            id: '1',
            mailboxIds: ['2']
          };
          var item2 = {
            id: '2',
            mailboxIds: ['3']
          };

          isolateScope.isDropZone([item, item2]);

          expect(inboxMailboxesService.canMoveMessage).to.have.been.calledTwice;
          expect(inboxMailboxesService.canMoveMessage).to.have.been.calledWith(item, $scope.mailbox);
          expect(inboxMailboxesService.canMoveMessage).to.have.been.calledWith(item2, $scope.mailbox);
        });

      });

    });

  });

  describe('The inboxFab directive', function() {
    var newComposerService;

    beforeEach(angular.mock.inject(function(_newComposerService_) {
      newComposerService = _newComposerService_;
    }));

    function findInnerFabButton(fab) {
      return angular.element(fab.children('button')[0]);
    }

    function expectFabToBeEnabled(button) {
      $scope.$digest();
      expect($scope.isDisabled).to.equal(false);
      expect(button.hasClass('btn-accent')).to.equal(true);
      expect(button.attr('disabled')).to.not.match(/disabled/);
    }

    function expectFabToBeDisabled(button) {
      $scope.$digest();
      expect($scope.isDisabled).to.equal(true);
      expect(button.hasClass('btn-accent')).to.equal(false);
      expect(button.attr('disabled')).to.match(/disabled/);
    }

    function compileFabDirective() {
      var fab = compileDirective('<inbox-fab></inbox-fab>');

      $timeout.flush();

      return findInnerFabButton(fab);
    }

    it('should disable the button when no space left on screen', function() {
      var button = compileFabDirective();

      $scope.$emit('box-overlay:no-space-left-on-screen');

      expectFabToBeDisabled(button);
    });

    it('should enable the button when new space left on screen', function() {
      var button = compileFabDirective();

      $scope.$emit('box-overlay:no-space-left-on-screen');
      $scope.$emit('box-overlay:space-left-on-screen');

      expectFabToBeEnabled(button);
    });

    it('should change location when the compose fn is called', function() {
      newComposerService.open = sinon.spy();
      var fab = compileFabDirective();

      fab.click();

      expect(newComposerService.open).to.have.been.calledOnce;
    });
  });

  describe('The recipientsAutoComplete directive', function() {
    function compileDirectiveThenGetScope() {
      compileDirective('<div><recipients-auto-complete ng-model="model" template="recipients-auto-complete"></recipients-auto-complete></div>', {
        $composerController: {
          search: {}
        }
      });

      return element.find('recipients-auto-complete').isolateScope();
    }

    function newTag(tag) {
      const inputScope = element.find('input').scope();

      inputScope.tagList.addText(tag);
      inputScope.$digest();
    }

    it('should define $scope.search from searchService.searchRecipients', function(done) {
      searchService.searchRecipients = function() { done(); };
      compileDirective('<div><recipients-auto-complete ng-model="model" template="recipients-auto-complete"></recipients-auto-complete></div>', {
        $composerController: {}
      });

      element.find('recipients-auto-complete').isolateScope().search();
    });

    it('should call searchService.searchRecipients with a list of excluded attendee', function() {
      searchService.searchRecipients = sinon.spy();

      var scope = compileDirectiveThenGetScope();

      scope.excludes = [{ id: 'foo', objectType: 'bar' }];

      scope.search('query');
      expect(searchService.searchRecipients).to.have.been.calledWith('query', [{ id: 'foo', objectType: 'bar' }]);
    });

    it('should define $scope.search from the composerDesktop directive controller', function(done) {
      searchService.searchRecipients = function() { done(); };
      compileDirective('<div><recipients-auto-complete ng-model="model" template="recipients-auto-complete"></recipients-auto-complete></div>', {
        $composerDesktopController: {}
      });

      element.find('recipients-auto-complete').isolateScope().search();
    });

    it('should add new added tag to excludes list', function() {
      var scope = compileDirectiveThenGetScope();
      var tag = { id: 'foog', objectType: 'bar' };

      scope.onTagAdded(tag);

      expect(scope.excludes).to.include({ id: 'foog', objectType: 'bar' });
    });

    it('should scrolldown element when a tag is added and broadcast an event to inform the fullscreen-edit-form to scrolldown', function() {
      var scope = compileDirectiveThenGetScope();
      var recipient = { displayName: 'user@domain' };

      scope.onTagAdded(recipient);

      expect(elementScrollService.autoScrollDown).to.have.been.calledWith();
    });

    it('should not add new tag if email is not valid', function() {
      var scope = compileDirectiveThenGetScope();

      expect(scope.onTagAdding({ email: 'invalid-email' })).to.equal(false);
    });

    it('should add new tag even if there is a not invalid email format when ignoring email format', function() {
      compileDirective('<div><recipients-auto-complete ng-model="model" template="recipients-auto-complete" ignore-email-format="true"></recipients-auto-complete></div>', {
        $composerController: {}
      });

      var scope = element.find('recipients-auto-complete').isolateScope();

      expect(scope.onTagAdding({ email: 'invalid-email' })).to.equal(true);
    });

    it('should fallback to email when name is missing', function() {
      $scope.model = [{ email: 'bob@example.com' }];

      expect(compileDirectiveThenGetScope().tags).to.deep.equal([
        {
          email: 'bob@example.com',
          name: 'bob@example.com'
        }
      ]);
    });

    it('should accept to add a new tag if email does not matche the email of an existing tag', function() {
      var scope = compileDirectiveThenGetScope();

      scope.tags.push({ email: 'user@domain' });
      scope.tags.push({ email: 'user2@domain' });
      scope.tags.push({ email: 'user3@domain' });

      expect(scope.onTagAdding({ email: 'user0@domain' })).to.equal(true);
    });

    it('should refuse to add a new tag if email matches the email of an existing tag', function() {
      var scope = compileDirectiveThenGetScope();

      scope.tags.push({ email: 'user@domain' });
      scope.tags.push({ email: 'user2@domain' });
      scope.tags.push({ email: 'user3@domain' });

      expect(scope.onTagAdding({ email: 'user2@domain' })).to.equal(false);
    });

    it('should not add new tag if email is in excluded emails list', function() {
      compileDirective('<div><recipients-auto-complete ng-model="model" excluded-emails="[\'email@op.org\']" template="recipients-auto-complete"></recipients-auto-complete></div>');
      var scope = element.find('recipients-auto-complete').isolateScope();

      expect(scope.onTagAdding({ email: 'email@op.org' })).to.equal(false);
    });

    it('should make sure "email" is defined', function() {
      var scope = compileDirectiveThenGetScope(),
        recipient = { name: 'a@a.com' };

      scope.onTagAdding(recipient);

      expect(recipient).to.deep.equal({ name: 'a@a.com', email: 'a@a.com' });
    });

    function expectTagsFromTextInput(text, tags) {
      var scope = compileDirectiveThenGetScope();

      newTag(text);

      expect(scope.tags).to.deep.equal(tags);
    }

    it('should make sure email is defined like this "<email@lin34.com>"', function() {
      expectTagsFromTextInput('<email@lin34.com>', [{ name: 'email@lin34.com', email: 'email@lin34.com' }]);
    });

    it('should make sure email is defined like this "<  email@lin34.com  >"', function() {
      expectTagsFromTextInput('<  email@lin34.com  >', [{ name: 'email@lin34.com', email: 'email@lin34.com' }]);
    });

    it('should make sure email is defined like this "   <email@lin34.com>"', function() {
      expectTagsFromTextInput('   <email@lin34.com>', [{ name: 'email@lin34.com', email: 'email@lin34.com' }]);
    });

    it('should make sure email is defined like this "<email@lin34.com>   "', function() {
      expectTagsFromTextInput('<email@lin34.com>    ', [{ name: 'email@lin34.com', email: 'email@lin34.com' }]);
    });

    it('should make sure email is defined like this "<email@lin34.com> <lin@gora.com>"', function() {
      expectTagsFromTextInput('<email@lin34.com> <lin@gora.com>', [{ name: 'email@lin34.com', email: 'email@lin34.com' }, { name: 'lin@gora.com', email: 'lin@gora.com' }]);
    });

    it('should make sure input is defined like this "name <email@lin.com>"', function() {
      expectTagsFromTextInput('test <email@lin.com>', [{ name: 'test', email: 'email@lin.com' }]);
    });

    it('should make sure input is defined like this "     name    <   email@lin.com   >"', function() {
      expectTagsFromTextInput('     name    <   email@lin.com   >', [{ name: 'name', email: 'email@lin.com' }]);
    });

    it('should make sure input is defined like this "name1 name2 <email@lin.com>"', function() {
      expectTagsFromTextInput('      name1 name2   name3 name4     <email@lin.com>', [{ name: 'name1 name2   name3 name4', email: 'email@lin.com' }]);
    });

    it('should make sure input is defined like this "name <email@lin.com> name2 <lin@gora.com>"', function() {
      expectTagsFromTextInput('name1 <email@lin.com>  name2 <email2@lin.com>', [{ name: 'name1', email: 'email@lin.com' }, { name: 'name2', email: 'email2@lin.com' }]);
    });

    it('should make sure input is defined like this "name <email@lin.com> <lin@gora.com>"', function() {
      expectTagsFromTextInput('name1 <email@lin.com>  <email2@lin.com>', [{ name: 'name1', email: 'email@lin.com' }, { name: 'email2@lin.com', email: 'email2@lin.com' }]);
    });

    it('should make sure input is defined like this "name   <   email@lin.com > name2   <  email2@lin.com  >"', function() {
      expectTagsFromTextInput('name1   <   email@lin.com >    name2   <  email2@lin.com  >', [{ name: 'name1', email: 'email@lin.com' }, { name: 'name2', email: 'email2@lin.com' }]);
    });

    it('should initialize the model if none given', function() {
      expect(compileDirectiveThenGetScope().tags).to.deep.equal([]);
    });

    it('should use the model if one given', function() {
      $scope.model = [{ a: '1' }];

      expect(compileDirectiveThenGetScope().tags).to.deep.equal([{ a: '1' }]);
    });

    it('should remove removed tag in excluded emails list', function() {
      var scope = compileDirectiveThenGetScope();
      var tag = { id: '123', objectType: 'bar' };

      scope.excludes = [tag];
      scope.onTagRemoved(tag);

      expect(scope.excludes).to.not.include(tag);
    });

    it('should call onEmailAdded after calling onTagRemoved', function() {
      $scope.onEmailAdded = sinon.spy();
      compileDirective('<div><recipients-auto-complete ng-model="model" on-email-added="onEmailAdded" template="recipients-auto-complete"></recipients-auto-complete></div>');
      var scope = element.find('recipients-auto-complete').isolateScope();
      var tag = { email: 'emai@no.aa' };

      scope.onTagAdded(tag);
      expect($scope.onEmailAdded).to.have.been.calledWith(tag);
    });

    it('should call onEmailRemoved after calling onTagRemoved', function() {
      $scope.onEmailRemoved = sinon.spy();
      compileDirective('<div><recipients-auto-complete ng-model="model" on-email-removed="onEmailRemoved" template="recipients-auto-complete"></recipients-auto-complete></div>');
      var scope = element.find('recipients-auto-complete').isolateScope();
      var tag = { email: 'emai@no.aa' };

      scope.onTagRemoved(tag);
      expect($scope.onEmailRemoved).to.have.been.calledWith(tag);
    });
  });

  describe('The email directive', function() {

    describe('the exposed functions from inboxJmapItemService', function() {
      beforeEach(function() {
        ['reply', 'replyAll', 'forward'].forEach(function(action) {
          inboxJmapItemService[action] = sinon.spy();
        });
      });

      it('should expose several functions to the element controller', function() {
        compileDirective('<email email="email"/>');

        ['reply', 'replyAll', 'forward'].forEach(function(action) {
          element.controller('email')[action]();

          expect(inboxJmapItemService[action]).to.have.been.called;
        });
      });
    });

    it('should show reply button and hide replyAll button if email.hasReplyAll is false', function() {
      $scope.email = { id: 'id', hasReplyAll: false };
      compileDirective('<email email="email"/>');

      expect(element.find('.mdi-reply').length).to.equal(1);
      expect(element.find('.mdi-reply-all').length).to.equal(0);
    });

    it('should hide reply button and show replyAll button if email.hasReplyAll is true', function() {
      $scope.email = { id: 'id', hasReplyAll: true };
      compileDirective('<email email="email"/>');

      expect(element.find('.mdi-reply').length).to.equal(0);
      expect(element.find('.mdi-reply-all').length).to.equal(1);
    });

    it('should escape HTML in plain text body', function() {
      $scope.email = {
        id: 'id',
        textBody: 'Body <i>with</i> weird <hu>HTML</hu>'
      };
      compileDirective('<email email="email"/>');

      expect(element.find('.email-body').html()).to.contain('Body &lt;i&gt;with&lt;/i&gt; weird &lt;hu&gt;HTML&lt;/hu&gt;');
    });

    it('should autolink links in plain text body', function() {
      $scope.email = {
        id: 'id',
        textBody: 'Body with me@open-paas.org and open-paas.org'
      };
      compileDirective('<email email="email"/>');

      expect(element.find('.email-body a[href="http://open-paas.org"]')).to.have.length(1);
      expect(element.find('.email-body a[href="mailto:me@open-paas.org"]')).to.have.length(1);
    });

    describe('The toggleIsCollapsed function', function() {

      it('should do nothing if email.isCollapsed is not defined', function() {
        var email = {}, spyFn = sinon.spy();

        var element = compileDirective('<email />');
        var scope = element.isolateScope();

        scope.$on('email:collapse', function() {
          spyFn();
        });

        element.controller('email').toggleIsCollapsed(email);

        expect(email.isCollapsed).to.be.undefined;
        expect(spyFn).to.not.have.been.called;
      });

      it('should toggle the email.isCollapsed attribute', function() {
        var email = {
          isCollapsed: true
        };

        compileDirective('<email />').controller('email').toggleIsCollapsed(email);
        expect(email.isCollapsed).to.equal(false);
      });

      it('should broadcast email:collapse event with the email.isCollapsed as data', function(done) {
        var email = {
          isCollapsed: true
        };

        var element = compileDirective('<email />');
        var scope = element.isolateScope();

        // eslint-disable-next-line no-unused-vars
        scope.$on('email:collapse', function(event, data) {
          expect(data).to.equal(false);
          done();
        });

        element.controller('email').toggleIsCollapsed(email);
      });
    });

  });

  describe('The inboxStar directive', function() {

    beforeEach(function() {
      inboxJmapItemService.setFlag = sinon.spy();
    });

    describe('The setIsFlagged function', function() {

      it('should call inboxJmapItemService.setFlag, passing the flag', function() {
        $scope.email = {};

        compileDirective('<inbox-star item="email" />').controller('inboxStar').setIsFlagged(true);

        expect(inboxJmapItemService.setFlag).to.have.been.calledWith($scope.email, 'isFlagged', true);
      });

    });

  });

  describe('The inboxFilterButton directive', function() {
    var scope, controller;

    beforeEach(function() {
      $scope.filters = [
        { id: 'filter_1', displayName: 'display filter 1' },
        { id: 'filter_2', displayName: 'display filter 2' },
        { id: 'filter_3', displayName: 'display filter 3' }
      ];

      element = compileDirective('<inbox-filter-button filters="filters"/>');
      scope = element.isolateScope();
      controller = element.controller('inboxFilterButton');
    });

    it('should init the scope with the required attributes', function() {
      expect(scope.dropdownList).to.deep.equal({
        placeholder: 'Filters',
        filtered: false
      });
    });

    it('should keep the checked filter and indicate set filtered to true', function() {
      $scope.filters = [
        { id: 'filter_1', displayName: 'display filter 1', checked: true },
        { id: 'filter_2', displayName: 'display filter 2' },
        { id: 'filter_3', displayName: 'display filter 3', checked: true }
      ];
      scope = compileDirective('<inbox-filter-button filters="filters"/>').isolateScope();

      expect(scope.dropdownList.filtered).to.be.true;
      expect(_.map($scope.filters, 'checked')).to.deep.equal([true, undefined, true]);
      expect(scope.dropdownList.placeholder).to.equal('2 selected');
    });

    it('should leverage the placeholder attribute as the default placeholder once passed', function() {
      scope = compileDirective('<inbox-filter-button filters="filters" placeholder="my placeholder"/>').isolateScope();

      expect(scope.dropdownList.placeholder).to.equal('my placeholder');
    });

    it('should call the $dropdown service once clicked on mobile', function() {
      element.find('.visible-xs button').click();

      expect($dropdown).to.have.been.calledOnce;
    });

    it('should call the $dropdown service once clicked on desktop', function() {
      element.find('.inbox-filter-button.hidden-xs').click();

      expect($dropdown).to.have.been.calledOnce;
    });

    it('should set the dropdownList as filtered when at least one filter is checked', function() {
      scope.filters[0].checked = true;
      controller.dropdownItemClicked();

      expect(scope.dropdownList.filtered).to.be.true;
    });

    it('should set the placeholder to the filter\'s displayName when only one filter is checked', function() {
      scope.filters[0].checked = true;
      controller.dropdownItemClicked();

      expect(scope.dropdownList.placeholder).to.equal('display filter 1');
    });

    it('should set the placeholder to the * selected when several filters are checked', function() {
      scope.filters[0].checked = true;
      scope.filters[1].checked = true;
      controller.dropdownItemClicked();

      expect(scope.dropdownList.placeholder).to.equal('2 selected');
    });

    it('should refresh the dropdown when inbox.filterChanged event is broadcasted', function() {
      scope.filters[0].checked = true;
      scope.filters[1].checked = true;
      $rootScope.$broadcast(INBOX_EVENTS.FILTER_CHANGED);

      expect(scope.dropdownList.placeholder).to.equal('2 selected');
    });

  });

  describe('The inboxEmailFooter directive', function() {

    it('should hide replyAll button if email.hasReplyAll is false', function() {
      $scope.email = { id: 'id', hasReplyAll: false };
      compileDirective('<inbox-email-footer email="email"/>');

      expect(element.find('.mdi-reply-all').length).to.equal(0);
    });

    it('should show replyAll button if email.hasReplyAll is true', function() {
      $scope.email = { id: 'id', hasReplyAll: true };
      compileDirective('<inbox-email-footer email="email"/>');

      expect(element.find('.mdi-reply-all').length).to.equal(1);
    });

    describe('its controller', function() {
      var controller;

      beforeEach(function() {
        $scope.email = { id: 'id' };
        compileDirective('<inbox-email-footer email="email"/>');
        controller = element.controller('inboxEmailFooter');
      });

      it('should expose a "reply" function', function() {
        inboxJmapItemService.reply = sinon.spy();

        controller.reply();

        expect(inboxJmapItemService.reply).to.have.been.calledWith($scope.email);
      });

      it('should expose a "replyAll" function', function() {
        inboxJmapItemService.replyAll = sinon.spy();

        controller.replyAll();

        expect(inboxJmapItemService.replyAll).to.have.been.calledWith($scope.email);
      });

      it('should expose a "forward" function', function() {
        inboxJmapItemService.forward = sinon.spy();

        controller.forward();

        expect(inboxJmapItemService.forward).to.have.been.calledWith($scope.email);
      });
    });

  });

  describe('The inboxEmailer directive', function() {

    var session;

    beforeEach(angular.mock.inject(function(_session_) {
      session = _session_;
    }));

    it('should resolve the emailer', function() {
      $scope.emailer = {
        resolve: sinon.spy()
      };

      compileDirective('<inbox-emailer emailer="emailer"/>');

      expect($scope.emailer.resolve).to.have.been.calledWith();
    });

    it('should resolve the emailer when it becomes available', function() {
      compileDirective('<inbox-emailer emailer="emailer"/>');

      $scope.emailer = {
        resolve: sinon.spy()
      };
      $scope.$digest();

      expect($scope.emailer.resolve).to.have.been.calledWith();
    });

    it('should not display the "me" message when the emailer is me', function() {
      session.user = { preferredEmail: 'me@linagora.com' };
      $scope.emailer = {
        email: 'another-one@linagora.com',
        resolve: angular.noop
      };

      compileDirective('<inbox-emailer emailer="emailer"/>');

      expect(element.find('.me')).to.have.length(0);
    });

    it('should display the "me" message when the emailer is me', function() {
      session.user = { preferredEmail: 'me@linagora.com' };
      $scope.emailer = {
        email: 'me@linagora.com',
        resolve: angular.noop
      };

      compileDirective('<inbox-emailer emailer="emailer"/>');

      expect(element.find('.me')).to.have.length(1);
    });

    it('should not display the email address if hide-email=true', function() {
      $scope.emailer = {
        email: 'me@linagora.com',
        resolve: angular.noop
      };

      compileDirective('<inbox-emailer emailer="emailer" hide-email="true" />');

      expect(element.find('.email')).to.have.length(0);
    });
  });

  describe('The inboxEmailerAvatar directive', function() {

    it('should resolve the emailer', function() {
      $scope.emailer = {
        resolve: sinon.stub().returns($q.when({}))
      };

      compileDirective('<inbox-emailer-avatar emailer="emailer"/>');

      expect($scope.emailer.resolve).to.have.been.calledWith();
    });

    it('should resolve the emailer when it becomes available', function() {
      compileDirective('<inbox-emailer-avatar emailer="emailer"/>');

      $scope.emailer = {
        resolve: sinon.stub().returns($q.when({}))
      };
      $scope.$digest();

      expect($scope.emailer.resolve).to.have.been.calledWith();
    });

    describe('The resolveAvatar function', function() {

      it('should return an emtpy object when there is no emailer available', function(done) {
        compileDirective('<inbox-emailer-avatar emailer="emailer"/>');

        element.isolateScope().$ctrl.resolveAvatar().then(function(avatar) {
          expect(avatar).to.deep.equal({});

          done();
        });
        $scope.$digest();
      });

      it('should return the resolved avatar', function(done) {
        $scope.emailer = {
          resolve: sinon.stub().returns($q.when({
            id: 'myId'
          }))
        };

        compileDirective('<inbox-emailer-avatar emailer="emailer"/>');

        element.isolateScope().$ctrl.resolveAvatar().then(function(avatar) {
          expect(avatar).to.deep.equal({
            id: 'myId'
          });

          done();
        });
        $scope.$digest();
      });

    });

  });

  describe('The inboxClearFiltersButton directive', function() {

    var filters;

    beforeEach(angular.mock.inject(function(inboxFilters) {
      filters = inboxFilters;
    }));

    it('should clear filters when clicked', function() {
      filters[0].checked = true;
      filters[1].checked = true;

      compileDirective('<inbox-clear-filters-button />').children().first().click();

      expect(_.filter(filters, { checked: true })).to.deep.equal([]);
    });

    it('should broadcast inbox.filterChanged when clicked', function(done) {
      $scope.$on(INBOX_EVENTS.FILTER_CHANGED, function() {
        done();
      });

      compileDirective('<inbox-clear-filters-button />').children().first().click();
    });

  });

  describe('The inboxEmptyContainerMessage directive', function() {

    var filters;

    beforeEach(angular.mock.inject(function(inboxFilters) {
      filters = inboxFilters;
    }));

    it('should expose a isFilteringActive function, returning true if at least one filter is checked', function() {
      filters[0].checked = true;

      compileDirective('<inbox-empty-container-message />');

      expect(element.isolateScope().isFilteringActive()).to.equal(true);
    });

    it('should expose a isFilteringActive function, returning false if no filter is checked', function() {
      compileDirective('<inbox-empty-container-message />');

      expect(element.isolateScope().isFilteringActive()).to.equal(false);
    });

    it('should expose a templateUrl from a plugin, if a plugin exist for the current type', function() {
      $stateParams.type = 'myPluginType';
      $templateCache.put('/myPluginTemplate', '');
      inboxPlugins.add({
        type: 'myPluginType',
        getEmptyContextTemplateUrl: _.constant($q.when('/myPluginTemplate'))
      });

      compileDirective('<inbox-empty-container-message />');

      expect(element.isolateScope().containerTemplateUrl).to.equal('/myPluginTemplate');
    });

    it('should expose a templateUrl with a default value if a plugin does not exist for the current type', function() {
      $stateParams.type = 'myPluginType';

      compileDirective('<inbox-empty-container-message />');

      expect(element.isolateScope().containerTemplateUrl).to.equal('/unifiedinbox/views/partials/empty-messages/containers/inbox.html');
    });

  });

  describe('The inboxEmailerDisplay directive', function() {

    var email;

    beforeEach(function() {
      email = {
        from: { name: 'Bob', email: 'bob@email', resolve: angular.noop },
        to: [{ name: 'Alice', email: 'alice@email', resolve: angular.noop }],
        cc: [{ name: 'Clark', email: 'clark@email', resolve: angular.noop }],
        bcc: [{ name: 'John', email: 'john@email', resolve: angular.noop }]
      };
    });

    it('should initialize by exposing scope attributes properly', function() {
      $scope.email = email;
      compileDirective('<inbox-emailer-display email="email" />');

      var isolateScope = element.isolateScope();

      expect(isolateScope.previewEmailer).to.deep.equal(email.to[0]);
      expect(isolateScope.previewEmailerGroup).to.deep.equal('To');
      expect(isolateScope.numberOfHiddenEmailer).to.equal(2);
      expect(isolateScope.showMoreButton).to.equal(true);
    });

    it('should display the first "To" recipient', function() {
      $scope.email = email;

      compileDirective('<inbox-emailer-display email="email" />');

      var isolateScope = element.isolateScope();

      expect(isolateScope.previewEmailer.email).to.deep.equal('alice@email');
      expect(isolateScope.previewEmailerGroup).to.deep.equal('To');
    });

    it('should display the first "CC" recipient', function() {
      $scope.email = _.omit(email, 'to');

      compileDirective('<inbox-emailer-display email="email" />');

      var isolateScope = element.isolateScope();

      expect(isolateScope.previewEmailer.email).to.deep.equal('clark@email');
      expect(isolateScope.previewEmailerGroup).to.deep.equal('CC');
    });

    it('should display the first "BCC" recipient', function() {
      $scope.email = _.omit(email, 'to', 'cc');

      compileDirective('<inbox-emailer-display email="email" />');

      var isolateScope = element.isolateScope();

      expect(isolateScope.previewEmailer.email).to.deep.equal('john@email');
      expect(isolateScope.previewEmailerGroup).to.deep.equal('BCC');
    });

    it('should be collapsed by default', function() {
      $scope.email = email;
      compileDirective('<inbox-emailer-display email="email" />');

      expect(element.find('.recipients .collapsed, .more .collapsed').length).to.equal(2);
      expect(element.find('.recipients .expanded, .more .expanded').length).to.equal(0);
    });

    it('should be expanded after a click on more button then collapsed when click again', function() {
      $scope.email = email;
      compileDirective('<inbox-emailer-display email="email" />');

      element.find('.more').click();

      expect(element.find('.recipients .collapsed, .more .collapsed').length).to.equal(0);
      expect(element.find('.recipients .expanded, .more .expanded').length).to.equal(2);

      element.find('.more').click();

      expect(element.find('.recipients .collapsed, .more .collapsed').length).to.equal(2);
      expect(element.find('.recipients .expanded, .more .expanded').length).to.equal(0);
    });

    it('should not show more button when there is only 1 recipient', function() {
      $scope.email = {
        from: { name: 'Bob', email: 'bob@email', resolve: angular.noop },
        to: [{ name: 'Alice', email: 'alice@email', resolve: angular.noop }],
        cc: []
      };
      compileDirective('<inbox-emailer-display email="email" />');

      expect(element.find('.more').css('display')).to.equal('none');
    });

    it('should show both name and email if there is only 1 recipient and it is not current user', function() {
      $scope.email = {
        from: { name: 'Bob', email: 'bob@email', resolve: angular.noop },
        to: [{ name: 'Alice', email: 'alice@email', resolve: angular.noop }],
        cc: []
      };

      compileDirective('<inbox-emailer-display email="email" />');

      expect(element.find('.to').html()).to.contain(email.to[0].name);
      expect(element.find('.to').html()).to.contain(email.to[0].email);
    });

    it('should not display any recipients if there is no recipients', function() {
      $scope.email = _.omit(email, 'to', 'cc', 'bcc');

      compileDirective('<inbox-emailer-display email="email" />');

      expect(element.find('.recipients .collapsed').length).to.equal(0);
      expect(element.find('.recipients .expanded').length).to.equal(0);
    });

  });

});

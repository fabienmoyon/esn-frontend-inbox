'use strict';

const _ = require('lodash');

angular.module('linagora.esn.unifiedinbox')

  .controller('inboxListHeaderController', function($scope, $stateParams, esnDatetimeService, inboxFilteringService, inboxPlugins, INBOX_EVENTS, INBOX_SEARCH_DEBOUNCE_DELAY) {
    var self = this,
    account = $stateParams.account,
    context = $stateParams.context,
    plugin = inboxPlugins.get($stateParams.type);

    self.$onInit = initQuickFilter;
    self.$onChanges = $onChanges;
    self.setQuickFilter = _.debounce(setQuickFilter, INBOX_SEARCH_DEBOUNCE_DELAY);

    $scope.$on(INBOX_EVENTS.FILTER_CHANGED, initQuickFilter);

    /////

    function initQuickFilter() {
      self.quickFilter = inboxFilteringService.getQuickFilter();

      if (plugin) {
        plugin.contextSupportsAttachments(account, context).then(function(value) {
          self.contextSupportsAttachments = value;
        });
      } else {
        self.contextSupportsAttachments = true;
      }
    }

    function $onChanges(bindings) {
      if (!bindings || !bindings.item) {
        return;
      }

      self.group = bindings.item.currentValue && esnDatetimeService.getHumanTimeGrouping(bindings.item.currentValue.date);
    }

    function setQuickFilter(filter) {
      if (!filter && !self.quickFilter) {
        return;
      }

      inboxFilteringService.setQuickFilter(self.quickFilter = filter);
    }
  });

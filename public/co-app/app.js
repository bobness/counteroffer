var PC_PREFIX = 'pc';

angular.module('counteroffer.app', [
  'xeditable',
  'ngCookies',
  'ngResource',
  'ui.bootstrap',
  'ngSanitize',
  'ngTagsInput',
  'ngDragToReorder'
])
  .run(function(editableOptions) {
    editableOptions.theme = 'bs3';
  });

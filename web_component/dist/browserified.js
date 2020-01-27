(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
ALLEX.execSuite.libRegistry.register('allex_angular1datatablelib',require('./libindex')(ALLEX, ALLEX.execSuite.libRegistry.get('allex_applib'), ALLEX.execSuite.libRegistry.get('allex_jqueryelementslib'), ALLEX.execSuite.libRegistry.get('allex_angular1elementslib')));

},{"./libindex":3}],2:[function(require,module,exports){
function createAngularDataTable (allex, applib, jqueryelementslib, angular1elementslib) {
  'use strict';

  var lib = allex.lib,
    AngularDataAwareController = angular1elementslib.AngularDataAwareController,
    DataElementMixIn = jqueryelementslib.DataElementMixIn,
    BasicAngularElement = angular1elementslib.BasicAngularElement,
    ANGULAR_REQUIREMENTS = angular1elementslib.ANGULAR_REQUIREMENTS,
    angular_module = angular.module('allex_angular1elementslib'),
    CBMapable = lib.CBMapable,
    q = lib.q;

  function addDefaultHeaderCellFilter (defaultHeaderCellFilter, columnDef) {
    if ('headerCellFilter' in columnDef) return;
    columnDef.headerCellFilter = defaultHeaderCellFilter;
  }

  function prepareActionsTable(config) {
    var ret = lib.extend({}, config.actions, {field : '-', enableFiltering : false});
    addDefaultHeaderCellFilter (config.defaultHeaderCellFilter, ret);
    return ret;
  }

  function AngularDataTable (id, options) {
    BasicAngularElement.call(this, id, options);
    this.afterEdit = new lib.HookCollection();
    this.config.grid = lib.extend({}, AngularDataTable.DEFAULT_GRID_CONFIG, this.config.grid);
    if (!this.config.grid.data) this.config.grid.data = '_ctrl.data';

    if (this.config.defaultHeaderCellFilter) {
      this.config.grid.columnDefs.forEach (addDefaultHeaderCellFilter.bind (null, this.config.defaultHeaderCellFilter));
    }
  }
  lib.inherit(AngularDataTable, BasicAngularElement);

  AngularDataTable.prototype.__cleanUp = function () {
    this.afterEdit.destroy();
    this.afterEdit = null;
    BasicAngularElement.prototype.__cleanUp.call(this);
  };

  function checkIfEditable (item) {
    return checkIfPropIsTrue ('enableCellEdit', item);
  }

  function checkIfResizable (item) {
    return checkIfPropIsTrue ('enableColumnResizing', item);
  }

  function checkIfPropIsTrue (prop, item) {
    if (item[prop]) return true;
  }

  function replaceTemplate (item, field) {
    var itemfield;
    if (!item) return;
    if (!item[field]) return;
    itemfield = item[field];
    if (!lib.isString(itemfield)) return;
    if (itemfield.charAt(0) !== '#') return;
    item[field] = jQuery('#references > '+item[field]).html();
  }

  AngularDataTable.prototype._replacePossibleTemplates = function (item) {
    replaceTemplate(item, 'cellTemplate');
    replaceTemplate (item, 'filterHeaderTemplate');
  };

  AngularDataTable.prototype.initialize = function () {
    BasicAngularElement.prototype.initialize.call(this);

    var editable = this.config.grid.enableCellEdit || lib.traverseConditionally (this.getColumnDefs(), checkIfEditable);
    var resizable = this.config.grid.enableColumnResizing || lib.traverseConditionally (this.getColumnDefs(), checkIfResizable);
    var noDataContent = this.getConfigVal('noDataContent');
    var dataString = this.getConfigVal('grid.data');
    this.getColumnDefs().forEach (this._replacePossibleTemplates.bind(this));

    var $container = $('<div class="table_container" ng-show="'+dataString+'.length"></div>');
    var $noDataContainer = $('<div class="no_data_container" ng-show = "!'+dataString+'.length"></div>');

    $container.attr('ui-grid', '_ctrl.gridOptions');
    $container.attr('ui-grid-auto-resize', '');

    if (editable) {
      $container.attr('ui-grid-edit','');
    }

    if (resizable) {
      $container.attr('ui-grid-resize-columns', '');
    }

    //noDataContent
    if (lib.isString(noDataContent)){
      if (noDataContent[0] === '#'){ //id
        $noDataContainer.append($('#references > ' + noDataContent).html());
      }else{ //markup
        $noDataContainer.append(noDataContent);
      }
    }
    if (noDataContent === true){ //find markup on pre-defined place in references
      $noDataContainer.append(this.findDomReference('nodata').html());
    }

    $container.addClass('grid');

    this.$element.attr({'data-allex-angular-data-table': ''});
    this.$element.append($container);
    if (!!noDataContent){
      this.$element.append($noDataContainer);
    }
    var $actions_template = this.findDomReference('actions'),
      $actions = null,
      wrapper = this.getConfigVal('actionsWrapper') ? $(this.getConfigVal('actionsWrapper')) : null,
      $wrapper = wrapper ? $(wrapper) : null;

    if ($wrapper) {
      $actions = $actions_template.length ? $wrapper.append($actions_template) : null;
    }else{
      $actions = $actions_template.length ? $actions_template : null;
    }
 
    if (!$actions) {
      return;
    }
    var cd = lib.arryOperations.findElementWithProperty (this.config.grid.columnDefs, 'field', '-'),
      actions = { displayName: $actions.attr('data-title') || 'Actions', cellTemplate: $actions.html()};
    if (cd) {
      if (!cd.displayName) cd.displayName = actions.displayName;
      if (!cd.cellTemplate) cd.cellTemplate = actions.cellTemplate;
    }else{
      this.config.grid.columnDefs.unshift (lib.extend ({}, actions, prepareActionsTable(this.config)));
    }
  };

  AngularDataTable.prototype.getApi = function () {
    return this.$scopectrl ? this.$scopectrl.api : null;
  };

  AngularDataTable.prototype._onScope = function (_ctrl) {
    var _cbmap = {
      appendNewRow : this.appendNewRow.bind(this)
    };

    if (this.$element.find('.grid.table_container').attr('ui-grid-edit') === '') {
      _cbmap.afterEdit = this.afterEdit.fire.bind(this.afterEdit);
    }


    _ctrl.set('_cbmap', _cbmap);
    //patch realative stupid approach ....
    this.config.grid.enableHorizontalScrollbar = this.config.grid.enableHorizontalScrollbar === false ? _ctrl.uiGridConstants.scrollbars.NEVER : _ctrl.uiGridConstants.scrollbars.ALWAYS;
    this.config.grid.enableVerticalScrollbar = this.config.grid.enableVerticalScrollbar === false ? _ctrl.uiGridConstants.scrollbars.NEVER : _ctrl.uiGridConstants.scrollbars.ALWAYS;

    this.config.grid.columnDefs.forEach (this._processFilters.bind(this, _ctrl));
    _ctrl.set('gridOptions', this.config.grid);
  };

  function _processSingleFilter (FILTERS, filter_data) {
    if (filter_data.type) {
      filter_data.type = FILTERS[filter_data.type];
    }

    if (filter_data.condition && lib.isString(filter_data.condition)) {
      filter_data.condition = FILTERS[filter_data.condition];
    }
  }

  AngularDataTable.prototype._processFilters = function (_ctrl, coldef, index) {
    var FILTERS = _ctrl.uiGridConstants.filter;

    if (coldef.filter) {
      _processSingleFilter (FILTERS,coldef.filter);
      coldef.filters = [coldef.filter];
      coldef.filter = null;
      return;
    }

    if (coldef.filters) {
      coldef.filters.forEach (_processSingleFilter.bind(null, FILTERS));
      return;
    }
  };

  AngularDataTable.prototype.set_data = function (data) {
    var ret = BasicAngularElement.prototype.set_data.call(this, data);
    if (false === ret) return;

    this.executeOnScopeIfReady ('set', ['data', data]);
    this.executeOnScopeIfReady ('api.core.refresh');
  };

  AngularDataTable.prototype.getCleanData = function () {
    angular.copy(this.getTableData());
  };

  AngularDataTable.prototype.appendNewRow = function (current_length) {
    var row = {};

    if (this.getConfigVal('config.bSetNewRowProps')) {
      ///TODO: uzmi iz grid options columnDefs i popuni row sa null ...
    }

    var f = this.getConfigVal('appendNewRow');
    return f ? f(this, current_length, row) : row;
  };

  AngularDataTable.prototype.get_rows = function () {
    return this.$scopectrl.api ? this.$scopectrl.api.grid.rows : null;
  };

  AngularDataTable.prototype.getElement = function (path) {
    if ('$element' === path) return this.$element;
    return BasicAngularElement.prototype.getElement.call(this, path);
  };


  AngularDataTable.prototype.set_row_count = function (rc) {
    return this.executeOnScopeIfReady ('set', ['row_count', rc]);
  };

  AngularDataTable.prototype.get_row_count = function () {
    return this.executeOnScopeIfReady ('get', ['row_count']);
  };

  AngularDataTable.prototype.getColumnDefs = function () {
    return this.getConfigVal('grid.columnDefs');
  };

  AngularDataTable.prototype.$apply = function () {
    BasicAngularElement.prototype.$apply.call(this);
    this.executeOnScopeIfReady ('api.core.refresh');
  };

  AngularDataTable.prototype.removeAllColumns = function () {
    if (this.isScopeReady()) {
      this.config.grid.columnDefs.splice(0, this.config.grid.columnDefs.length);
      this.refreshGrid();
    }else{
      var cd = this.getColumnDefs();
      cd.splice (0, cd.length);
    }
  };

  AngularDataTable.prototype.appendColumn = function (definition) {
    if (this.isScopeReady()){
      this.config.grid.columnDefs.push (definition);
      this.refreshGrid();
    }else{
      this.getColumnDefs().push(definition);
    }
  };

  AngularDataTable.prototype.set_column_defs = function (defs) {
    if (this.isScopeReady()) {
      this.config.grid.columnDefs = defs;
      this.refreshGrid();
    }else{
      var cd = this.getColumnDefs();
      cd.splice (0, cd.length);
      Array.prototype.push.apply(cd, defs);
    }
  };

  AngularDataTable.prototype.updateColumnDef = function (name, coldef) {
    if (this.isScopeReady()){
      var column = this.getColumnDef(name);
      column.colDef = coldef;
      this.refreshGrid();
      return;
    }

    var cd = this.getColumnDef (name), all = this.getColumnDefs(), index = all.indexOf(cd);
    if (index < 0) throw new Error ('No column definition for name ', name);
    all[index] = coldef;
  };

  AngularDataTable.prototype.getColumnDef = function (name) {
    if (this.isScopeReady() && this.getApi().grid.columns.length){
      var column = this.getApi().grid.getColumn (name);
      return column ? column.colDef : null;
    }
    return lib.arryOperations.findElementWithProperty (this.getColumnDefs(), 'name', name);
  };

  AngularDataTable.prototype.refreshGrid = function () {
    this.executeOnScopeIfReady ('api.grid.refresh');
  };

  function extractEntity (item) {
    return item.entity;
  }

  AngularDataTable.prototype.getTableData = function () {
    return this.executeOnScopeIfReady('getActualData');
  };

  AngularDataTable.prototype.getRowIndexUponEntity = function (entity_data) {
    var rows = this.getApi().grid.rows;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].entity.$$hashKey === entity_data.$$hashKey) return i;
    }
    return -1;
  };

  AngularDataTable.prototype.removeRow = function (entity_data) {
    var data = this.getTableData(),
      index = this.getRowIndexUponEntity (entity_data);
    if (index < 0) return;

    data.splice(index, 1);
    this.refreshGrid();
  };

  AngularDataTable.isSpecialColumnName = function (key) {
    return '-' === key;
  };

  AngularDataTable.DEFAULT_GRID_CONFIG = null;

  applib.registerElementType('AngularDataTable', AngularDataTable);
  ANGULAR_REQUIREMENTS.add ('AngularDataTable', ['ui.grid','ui.grid.edit', 'ui.grid.autoResize', 'ui.grid.resizeColumns']);

  //This is angular part of code ... //and what about this ... raise ....
  function AllexAngularDataTableController ($scope, $parse, uiGridConstants) {
    AngularDataAwareController.call(this, $scope);
    CBMapable.call(this);
    this.uiGridConstants = uiGridConstants;
    this.data = [];
    this.gridOptions = null;
    this.api = null;

    this._listenToEditEvents = false;
  }
  lib.inherit (AllexAngularDataTableController, AngularDataAwareController);
  CBMapable.addMethods (AllexAngularDataTableController);


  AllexAngularDataTableController.prototype.__cleanUp = function () {
    this.uiGridConstants = null;
    this.rowCountChanged.destroy();
    this.rowCountChanged = null;

    this.editDone = new lib.HookCollection();

    this.gridOptions = null;
    this.data = null;
    this.api = null;
    CBMapable.prototype.__cleanUp.call(this);
    AngularDataAwareController.prototype.__cleanUp.call(this);
  };

  AllexAngularDataTableController.prototype.set_gridOptions = function (val) {
    if (this.gridOptions === val) {
      return false;
    }
    this.api = null;

    ///TODO: check if equal ...
    this.gridOptions = val;
    if (!this.gridOptions) {
      return true;
    }

    this.gridOptions.onRegisterApi = this.set.bind(this, 'api');
  };

  AllexAngularDataTableController.prototype.set_api = function (api) {
    if (this.api === api) return;
    this.api = api;
    if (this._cbmap && this._cbmap.afterEdit) {
      this.api.edit.on.afterCellEdit(this.scope, this._onAfterEdit.bind(this));
    }
  };

  AllexAngularDataTableController.prototype._onAfterEdit = function (rowEntity, colDef, newValue, oldValue) {
    if (oldValue === newValue) return;

    this.call_cb('afterEdit', [{
      newValue : newValue,
      oldValue : oldValue,
      row : rowEntity,
      field : colDef.name
    }]);
  };

  function doReturn (what) { return what; }

  AllexAngularDataTableController.prototype.set_row_count = function (val) {

    var rows = this.getActualData();
    if (!lib.isArray(rows)) return false; ///TODO ...

    var rc = rows.length,
      new_row = null;

    if (val === rc) return false;

    if (val < rc) {
      rows.splice (val, rc-val);
    }else{
      while (rows.length < val) {
        new_row = this.call_cb('appendNewRow', [rows.length]);
        rows.push (new_row);
      }
    }
    return true;
  };

  AllexAngularDataTableController.prototype.getActualData = function (){
    return (lib.isString(this.gridOptions.data)) ? this.scope.$eval(this.gridOptions.data) : this.gridOptions.data;
  };

  AllexAngularDataTableController.prototype.get_row_count = function () {
    return this.getActualData().length;
  };

  angular_module.controller('allexAngularDataTableController', ['$scope', '$parse', 'uiGridConstants', function ($scope, $parse, uiGridConstants) {
    new AllexAngularDataTableController($scope, $parse, uiGridConstants);
  }]);

  angular_module.directive ('allexAngularDataTable', [function () {
    return {
      restrict : 'A',
      scope: true,
      controller: 'allexAngularDataTableController',
      link : function ($scope, $el, $attribs) {
        $scope._ctrl.elementReady ($el);
      }
    };
  }]);
}

module.exports = createAngularDataTable;

},{}],3:[function(require,module,exports){
function createLib (execlib, applib, jqueryelementslib, angular1elementslib) {
  'use strict';

  require('./elements/datatablecreator')(execlib, applib, jqueryelementslib, angular1elementslib);
  require('./modifiers/datatableautoappendrowcreator')(execlib, applib);

  return {};
}

module.exports = createLib;

},{"./elements/datatablecreator":2,"./modifiers/datatableautoappendrowcreator":4}],4:[function(require,module,exports){
function createAngularDataTableAutoAppendRowModifier (allex, applib) {
  'use strict';

  var lib = allex.lib,
    BasicModifier = applib.BasicModifier,
    AngularDataTable = applib.getElementType('AngularDataTable');


  function RowManipulator (modifier) {
    this.modifier = modifier;
  }

  RowManipulator.prototype.destroy = function () {
    this.modifier = null;
  };

  RowManipulator.prototype.isEmpty = function (entity) {
    return modifier.isEmpty(entity);
  };

  function AngularDataTableAutoAppendRow (options) {
    BasicModifier.call(this, options);
  }
  lib.inherit (AngularDataTableAutoAppendRow, BasicModifier);
  AngularDataTableAutoAppendRow.prototype.destroy = function () {
    BasicModifier.prototype.destroy.call(this);
  };

  AngularDataTableAutoAppendRow.prototype.ALLOWED_ON = function () {
    return 'AngularDataTable';
  };

  AngularDataTableAutoAppendRow.prototype.DEFAULT_CONFIG = function () {
    return {
      eventName : 'removeRow',
      isEmpty : function (obj) {
        for (var i in obj) {
          if (lib.isVal(obj[i])) return false;
        }

        return true;
      },
      isFull : function (obj) {
        for (var i in obj) {
          if (!lib.isVal(obj[i])) return false;
        }
        return true;
      }
    };
  };

  AngularDataTableAutoAppendRow.prototype._addNewRow = function (options) {
    var ret = {
    }, item, key;

    for (var i in options.grid.columnDefs) {
      item = options.grid.columnDefs[i];
      key = item.field || item.name;

      if (AngularDataTable.isSpecialColumnName(key)) continue;
      ret[key] = null;
    }

    return ret;
  };

  AngularDataTableAutoAppendRow.prototype.doProcess = function (name, options, links, logic, resources) {
    var eventName = this.getConfigVal('eventName');

    if (!this.getConfigVal('newRow')) {
      this.setConfigVal ('newRow', this._addNewRow.bind(this, options), true);
    }

    if (!lib.isFunction (this.getConfigVal('newRow'))) throw new Error('newRow is not a function');
    if (!lib.isFunction (this.getConfigVal('isEmpty'))) throw new Error('isEmptyRow must be a function');
    if (!lib.isFunction (this.getConfigVal('isFull'))) throw new Error('isFull must be a function');

    options.appendNewRow = this.getConfigVal ('newRow');
    if (!options.helperObj) {
      options.helperObj = {};
    }
    options.helperObj.autoappend = new RowManipulator(this);

    var ret = [{
      triggers : '.!afterEdit',
      references : '.',
      handler : this._onAfterEdit.bind(this, this.getConfigVal('isEmpty'), this.getConfigVal('isFull'))
    },
    {
      triggers : '.$element!'+eventName,
      references : '.',
      handler : this._onRemoveRequested.bind(this)
    },{
      triggers : '.:data',
      references : '.',
      handler : this._onData.bind(this, this.getConfigVal('isEmpty'), this.getConfigVal('isFull'))
    }];

    Array.prototype.push.apply (logic, ret);
  };

  AngularDataTableAutoAppendRow.prototype._onData = function (isEmpty, isFull, Table, data) {
    ///TODO: here is a potential problem : once data is null this wouldn't append special row ... might be a problem ...
    if (lib.isNull(data)) return;
    this._doAppend (isEmpty, isFull, Table);
  };

  AngularDataTableAutoAppendRow.prototype.isEmptyRow = function (entity, isEmpty) {
    return isEmpty(entity);
  };

  AngularDataTableAutoAppendRow.prototype._doAppend = function (isEmpty, isFull, table) {
    var data = table.getTableData(),
      last = data[data.length-1];

    if (data.length === 0) {
      table.set('row_count', 1);
      return;
    }
    if (isEmpty (last) || !isFull(last)) return;
    table.set('row_count', table.get('row_count')+1);
  };

  AngularDataTableAutoAppendRow.prototype._onAfterEdit = function (isEmpty, isFull, table,  obj) {
    if (!obj.row || !isFull(obj.row)) return; //nothing to be done ....
    this._doAppend (isEmpty, isFull, table);
  };

  AngularDataTableAutoAppendRow.prototype._onRemoveRequested = function (table, evnt, obj) {
    table.removeRow (obj);
  };

  applib.registerModifier ('AngularDataTableAutoAppendRow', AngularDataTableAutoAppendRow);

}

module.exports = createAngularDataTableAutoAppendRowModifier;

},{}]},{},[1]);

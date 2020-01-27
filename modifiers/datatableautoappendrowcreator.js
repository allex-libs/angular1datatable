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

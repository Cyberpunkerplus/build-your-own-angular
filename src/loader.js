/* jshint globalstrict: true */
'use strict';

function setupModuleLoader(window){
    var ensure = function(obj, name, factory){
        return obj[name] || (obj[name] = factory());
    };
    var angular = ensure(window, 'angular', Object);

    ensure(angular, 'module', function(){
        var modules = {};
        return function(name, requires){
            if(requires) {
                return createModule(name, requires, modules);                
            } else {
                console.log("getModule");
                return getModule(name, modules);
            }
        };
    });

    var createModule = function(name, requires, modules) {
        if (name === 'hasOwnProperty') {
            throw 'hasOwnProperty is not a valid module name';
        }
        var invokeQueue = [];
        var invokeLater = function(method) {
            return function() {
                invokeQueue.push([method, arguments]);
                return moduleInstance;
            };
        };
        var moduleInstance = {
            name: name,
            requires: requires,
            constant: invokeLater('constant'),
            provider: invokeLater('provider'),
            _invokeQueue: invokeQueue
        };
        modules[name] = moduleInstance;
        return moduleInstance;
    };
    var getModule = function(name, modules){
        if(modules.hasOwnProperty(name)) {
            console.log("has module");
            return modules[name];            
        } else {
            console.log("no exist module");
            throw 'Module ' + name + ' is not available';
        }
    }; 

}
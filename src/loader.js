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
        var configBlocks = [];
        var invokeLater = function(service, method, arrayMethod, queue) {
            return function() {
                var item = [service, method, arguments];
                queue = queue || invokeQueue;
                queue[arrayMethod || 'push' ](item);
                return moduleInstance;
            };
        };
        var moduleInstance = {
            name: name,
            requires: requires,
            constant: invokeLater('$provide', 'constant', 'unshift'),
            provider: invokeLater('$provide', 'provider'),
            config:invokeLater('$injector', 'invoke', 'push', configBlocks),
            _invokeQueue: invokeQueue,
            _configBlocks: configBlocks
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
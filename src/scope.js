/* jshint globalstrict: true */
'use strict';

function Scope() {
    this.$$watchers = [];
    this.$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$applyAsyncQueue = [];
    this.$$postDigestQueue = [];
    this.$$applyAsyncId = null;
    this.$$phase = null;
    this.$root = this;
    this.$$children = [];
    this.$$listeners = {};
}

function initWatchVal(){}

Scope.prototype.$watch = function(watchFn, listenerFn, valueEq){
    var self  = this;
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function() {},
        last: initWatchVal,
        valueEq: !!valueEq
    };

    this.$$watchers.unshift(watcher);
    this.$root.$$lastDirtyWatch = null;
    return function(){
        var index = self.$$watchers.indexOf(watcher);
        if(index >=0){
            self.$$watchers.splice(index, 1);
            self.$root.$$lastDirtyWatch = null;
        }
    };
};

Scope.prototype.$digest = function(){
    var ttl = 10;
    var dirty;
    this.$root.$$lastDirtyWatch = null;
    this.$beginPhase('$digest');

    if(this.$root.$$applyAsyncId) {
        clearTimeout(this.$root.$$applyAsyncId);
        this.$$flushApplyAsync();
    }
    do {
        while(this.$$asyncQueue.length){
            try {
                var asyncTask = this.$$asyncQueue.shift();
                asyncTask.scope.$eval(asyncTask.expression);
            } catch (error) {
                console.error(error);
            }
          
        }
        dirty = this.$$digestOnce();
        if((dirty || this.$$asyncQueue.length ) && !(ttl--)) {
            this.$clearPhase();
            throw "10 digest iterations reached";
        }
    } while(dirty || this.$$asyncQueue.length);
    this.$clearPhase();
    while(this.$$postDigestQueue.length){
        try {
            this.$$postDigestQueue.shift()();            
        } catch (error) {
            console.error(error);
        }
    }
};


Scope.prototype.$$digestOnce = function() {
    var self = this;
    var continueLoop = true;
    var dirty;
    this.$$everyScope(function(scope){
        var newValue, oldValue;
        _.forEachRight(scope.$$watchers, function(watcher){
            try {
                if(watcher){
                    newValue = watcher.watchFn(scope);
                    oldValue = watcher.last;
                    if(!scope.$$areEqual(newValue, oldValue, watcher.valueEq)){
                        self.$root.$$lastDirtyWatch = watcher;
                        watcher.last = watcher.valueEq?_.cloneDeep(newValue) : newValue;
                        watcher.listenerFn(newValue, oldValue === initWatchVal? newValue : oldValue, scope);            
                        dirty = true;
                    } else if(self.$root.$$lastDirtyWatch === watcher){
                        continueLoop = false;
                        return false;
                    }
                }
                
            } catch (error) {
                console.error(error);
            }
        });
        return  continueLoop;
    });
    return dirty;
};

Scope.prototype.$$areEqual = function(newValue, oldValue, valueEq){
    if (valueEq) {
        return _.isEqual(newValue, oldValue);
    } else {
        return newValue === oldValue || (typeof newValue === 'number' && typeof oldValue === 'number' &&
         isNaN(newValue) && isNaN(oldValue)
    );
    }
};

Scope.prototype.$eval = function(expr, locals){
    return expr(this, locals);
};

Scope.prototype.$apply = function(expr){
    try{
        this.$beginPhase('$apply');
        return this.$eval(expr);
    } finally{
        this.$clearPhase();
        this.$root.$digest();
    }
};

Scope.prototype.$evalAsync = function(expr){
    var self = this;
    if( !self.$$phase && !self.$$asyncQueue.length){
        setTimeout(function() {
            if(self.$$asyncQueue.length){
                self.$root.$digest();
            }
        }, 0);
    }
    this.$$asyncQueue.push({
        scope: this,
        expression: expr
    });
};

Scope.prototype.$beginPhase = function(phase){
    if(this.$$phase){
        throw this.$$phase + 'already in progress';
    }
    this.$$phase = phase;
};

Scope.prototype.$clearPhase = function() {
    this.$$phase = null;
};

Scope.prototype.$applyAsync = function(expr){
    var self = this;
    self.$$applyAsyncQueue.push(function(){
        self.$eval(expr);
    });

    if(self.$root.$$applyAsyncId === null) {
        self.$root.$$applyAsyncId = setTimeout(function() {
            self.$apply(_.bind(self.$$flushApplyAsync, self));
        }, 0);
    }
};

Scope.prototype.$$flushApplyAsync = function(){
    while(this.$$applyAsyncQueue.length){
        try {
            this.$$applyAsyncQueue.shift()();                        
        } catch (error) {
            console.error(error);
        }

    }
    this.$root.$$applyAsyncId = null;
};

Scope.prototype.$$postDigest = function(expr){
    this.$$postDigestQueue.push(expr);
};

Scope.prototype.$watchGroup = function(watchFns, listenerFn){
    var self = this;
    var newValues = new Array(watchFns.length);
    var oldValues = new Array(watchFns.length);
    var firstRun = true;
    var changeReactionScheduled = false;

    if(watchFns.length === 0){
        var shouldCall = true;
        self.$evalAsync(function(){
            if(shouldCall){
                listenerFn(newValues, oldValues, self);
            }
        });

        return function(){
            shouldCall = false;
        };
    }

    function watchGroupListener() {
        if(firstRun){
            firstRun = false;
            listenerFn(newValues, newValues, self);            
        } else {
            listenerFn(newValues, oldValues, self);
        }
        changeReactionScheduled = false;
    }
    var destroyFunctions =  _.map(watchFns, function(watchFn, i){
        return self.$watch(watchFn, function(newValue, oldValue){
            newValues[i] = newValue;
            oldValues[i] = oldValue;
            if(!changeReactionScheduled){
                changeReactionScheduled = true;
                self.$evalAsync(watchGroupListener);
            }
        });
    });

    return function(){
        _.forEach(destroyFunctions, function(destroyFunction){
            destroyFunction();
        });
    };
};

Scope.prototype.$new = function(isoloate, parent) {
    var child;
    parent  = parent || this;
    if(isoloate){
        child = new Scope();
        child.$root = parent.$root;
        child.$$asyncQueue = parent.$$asyncQueue;
        child.$$postDigestQueue = parent.$$postDigestQueue;
        child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
    } else {
        var ChildScope = function(){};
        ChildScope.prototype = this;
        child = new ChildScope();
    }
    
    parent.$$children.push(child);
    child.$$watchers = [];
    child.$$children = [];
    child.$parent = parent;
    child.$$listeners = {};
    return child;
};

//  递归的思想，注意收敛条件
Scope.prototype.$$everyScope = function(fn){
    if (fn(this)) {
        return this.$$children.every(function(child){
            return child.$$everyScope(fn);
        });
    } else {
        return false;
    }
};


Scope.prototype.$destroy = function(){
    this.$broadcast('$destroy');
    if(this.$parent){
        var siblings = this.$parent.$$children;
        var indexOfThis = siblings.indexOf(this);
        if(indexOfThis >0 ){
            siblings.splice(indexOfThis, 1);
        }
        this.$$watchers = null;
    }
    this.$$listeners = {};
};

Scope.prototype.$watchCollection = function(watchFn, listenerFn){
    var self = this;
    var newValue,
        oldValue,
        oldLength;
    var changeCount = 0;
    var firstRun = true;
    var veryOldValue;
    var trackVeryOldValue = (listenerFn.length > 1);
    
    var internalWatchFn = function(scope){
        var newLength;
        newValue = watchFn(scope);

        if(_.isObject(newValue)){
            if(_.isArrayLike(newValue)){
                if(!_.isArray(oldValue)){
                    changeCount++;
                    oldValue = [];
                }
                if(newValue.length !== oldValue.length){
                    changeCount++;
                    oldValue.length = newValue.length;
                }
                _.forEach(newValue, function(newItem, i){
                    var bothNaN = _.isNaN(newItem) && _.isNaN(oldValue[i]);
                    if (!bothNaN && newItem !== oldValue[i]){
                        changeCount++;
                        oldValue[i] = newItem;
                    }
                });
            } else {
                if(!_.isObject(oldValue) || _.isArrayLike(oldValue)){
                    changeCount++;
                    oldValue = {};
                    oldLength = 0;                    
                }

                newLength = 0;
                _.forOwn(newValue, function(newVal, key){
                    newLength++;
                    if(oldValue.hasOwnProperty(key)){
                        var bothNaN = _.isNaN(newVal) && _.isNaN(oldValue[key]);
                        if(!bothNaN && oldValue[key] !== newVal){
                            changeCount++;
                            oldValue[key] = newVal;
                        }
                    } else {
                        changeCount++;
                        oldLength++;
                        oldValue[key] = newVal;
                    }
                });

                if(oldLength > newLength){
                    changeCount++;
                    _.forOwn(oldValue, function(oldVal, key){
                        if( !newValue.hasOwnProperty(key)){
                            oldLength--;
                            delete oldValue[key];
                        }
                    });
                }
            }
        } else {
            if(!self.$$areEqual(newValue, oldValue, false)) {
                changeCount++;
            }
            oldValue = newValue;
        }

        return changeCount;

    };
    var internalListenerFn = function(){
        if(firstRun){
            listenerFn(newValue, newValue, self);
            firstRun = false;
        } else {
            listenerFn(newValue, veryOldValue, self);            
        }
        if( trackVeryOldValue){
            veryOldValue = _.clone(newValue);
        }
    };
    return this.$watch(internalWatchFn, internalListenerFn);
};

Scope.prototype.$on = function(eventName, listener){
    var listeners = this.$$listeners[eventName];
    if(!listeners){
        this.$$listeners[eventName] = listeners = [];
    }
    listeners.push(listener);
    return function(){
        var index = listeners.indexOf(listener);
        if(index >=0) {
            listeners[index] = null;
        }
    };
};

Scope.prototype.$emit = function(eventName){
    var propagationStopped = false;
    var event = {
        name: eventName, 
        targetScope: this,
        stopPropagation: function(){
            propagationStopped = true;
        },
        preventDefault: function(){
            event.defaultPrevented = true;
        }
    };
    var listenerArgs = [event].concat(_.drop(arguments));
    var scope = this;
    do {
        event.currentScope = scope;
        scope.$$fireEventOnScope(eventName, listenerArgs);
        scope = scope.$parent;
    } while(scope && !propagationStopped);
    event.currentScope = null;
    return event;
};
Scope.prototype.$broadcast = function(eventName){
    var event = {
        name: eventName, 
        targetScope: this,
        preventDefault: function(){
            event.defaultPrevented = true;
        }
    };
    var listenerArgs = [event].concat(_.drop(arguments));  
    this.$$everyScope(function(scope){
        event.currentScope = scope;
       scope.$$fireEventOnScope(eventName, listenerArgs);
       return true; 
    });
    event.currentScope = null;
    return event;
};

Scope.prototype.$$fireEventOnScope = function(eventName, listenerArgs) {
    var listeners = this.$$listeners[eventName] || [];
    var i = 0;
    while(i < listeners.length){
        if(listeners[i] === null) {
            listeners.splice(i, 1);
        } else {
            try {
                listeners[i].apply(null, listenerArgs);
               
            } catch(e) {
                console.error(e);
            }
            i++;
        }
    }
    return event;
};


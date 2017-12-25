/* jshint globalstrict: true */
/* global createInjector: false, setupModuleLoader: false, angular: false */

'use strict';
describe('injector', function(){
    beforeEach(function(){
        delete window.angular;
        setupModuleLoader(window);
    });

    it('can be created', function(){
        var injector = createInjector([]);
        expect(injector).toBeDefined();
    });

    it("has a const that has been registered to a module", function(){
        var module = angular.module('myModule', []);
        module.constant('aConstant', 42);
        var injector = createInjector(['myModule']);
        expect(injector.has('aConstant')).toBe(true);
    });

    it('does not have a non-registered constant', function(){
        var module = angular.module('myModule', []);
        var injector = createInjector(['myModule']);
        expect(injector.has('aConstant')).toBe(false);
    });

    it("does not allow a constant called hasOwnProperty", function(){
        var module = angular.module('myModule', []);
        module.constant('hasOwnProperty', _.constant(false));
        expect(function(){
            createInjector(['myModule']);
        }).toThrow();
    });

    it("can return a registered constant", function(){
        var module = angular.module('myModule', []);
        module.constant('aConstant', 42);
        var injector = createInjector(['myModule']);
        expect(injector.get('aConstant')).toBe(42);
    });

    it("loads multiple module", function(){
        var module1 = angular.module('myModule', []);
        var module2 = angular.module('myOtherModule', []);
        module1.constant('aConstant', 42);
        module2.constant('anotherConstant', 43);
        var injector = createInjector(['myModule', 'myOtherModule']);

        expect(injector.has('aConstant')).toBe(true);
        expect(injector.has('anotherConstant')).toBe(true);
    });

    it("loads the required modules of a module", function(){
        var module1 = angular.module('myModule', []);
        var module2 = angular.module('myOtherModule', ['myModule']);
        module1.constant('aConstant', 42);
        module2.constant('anotherConstant', 43);
        var injector = createInjector(['myOtherModule']);
        expect(injector.has('aConstant')).toBe(true);
        expect(injector.has('anotherConstant')).toBe(true);

    });

    it("loads each module only once",function(){
        angular.module('myModule', ['myOtherModule']);
        angular.module('myOtherModule', ['myModule']);
    });

    it("invokes an annotated function with dependency injections", function(){
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);
        var injector = createInjector(['myModule']);
        var fn = function(one, two){
            return one + two;
        };
        fn.$inject = ['a', 'b'];

        expect(injector.invoke(fn)).toBe(3);
    });

    it("does not accept non-strings as injection tokens", function(){
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        var injectors = createInjector(['myModule']);
        var fn = function(one, two) {
            return one + two;
        };
        fn.$inject = ['a', 2];
        expect(function(){
            injector.invoke(fn);
        }).toThrow();
    });

    it('invokes a function with the given this context', function(){
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        var injector = createInjector(['myModule']);
        var obj = {
            two: 2,
            fn : function(one) {
                return one + this.two;
            }
        };

        obj.fn.$inject = ['a'];
        expect(injector.invoke(obj.fn, obj)).toBe(3);

    });

    it("overrides dependencies with locals when invoking", function(){
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);

        var injector = createInjector(['myModule']);

        var fn = function(one, two) {
            return one + two;
        };
        fn.$inject = ['a', 'b'];
        expect(injector.invoke(fn, undefined, {b: 3})).toBe(4);

    })

})

describe('annotate', function(){
    it("returns the $inject annotation of a function when it has one", function(){
        var injector = createInjector([]);
        var fn  = function(){};

        fn.$inject = ['a', 'b'];
        expect(injector.annotate(fn)).toEqual(['a', 'b']);
    });

    it('returns the array-like annoations of a function', function(){
        var injector = createInjector([]);
        var fn = ['a', 'b', function(){}];
        expect(injector.annotate(fn)).toEqual(['a', 'b']);
    });

    it("returns an empty array for a non annotated 0 arg function", function(){
        var injector = createInjector([]);
        var fn = function(){};
        expect(injector.annotate)
    })

    it("returns annotating parsed from function args when not annotated", function(){
        var injector = createInjector([]);
        var fn = function(a, b){};
        console.log(injector.annotate(fn));
        expect(injector.annotate(fn)).toEqual(['a', 'b']);
    });

    it('strips comments from arguments lists when parsing', function(){
        var injector = createInjector([]);
        var fn = function(a, /*b,*/ c){};
        expect(injector.annotate(fn)).toEqual(['a', 'c']);
    });

    it('strips several comments from argument lists when parsing', function(){
        var injector = createInjector([]);

        var fn = function(a, /*b,*/ c/*,d*/){};
        expect(injector.annotate(fn)).toEqual(['a', 'c']);
    });

    it('strips // comments from argument list when parsing', function(){
        var injector = createInjector([]);
        var fn = function(a, //b,
                            c) {};
        expect(injector.annotate(fn)).toEqual(['a', 'c']);
    });

    it('strips surrounding underscores from argument names when parsing', function(){
        var injector = createInjector([]);

        var fn = function(a, _b_, c_, d_, an_argument){};
        expect(injector.annotate(fn)).toEqual(['a', 'b', 'c_', 'd_', 'an_argument']);
    });

    it('throws when using a non-annotated fn in strict mode', function(){
        var injector = createInjector([], true);
        var fn = function(a, b, c){
        };
        expect(function(){
            injector.annotate(fn);
        }).toThrow();

    });

    it("invokes an array-annotated function with dependency injection", function(){
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);
        var injector = createInjector(['myModule']);
        var fn = ['a', 'b', function(one, two){
            return one + two;
        }];
        expect(injector.invoke(fn)).toBe(3);
    });

    it("invokes a non-annotated function with dependency injection", function(){
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);

        var injector = createInjector(['myModule']);
        var fn = function(a, b) {
            return a + b;
        };
        expect(injector.invoke(fn)).toBe(3);
    });


    it("instantiates an annotated constructor function", function(){
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);
        var injector = createInjector(['myModule']);

        function Type(one, two) {
            this.result = one + two;
        }

        Type.$inject = ['a', 'b'];

        var instance = injector.instantiate(Type);
        expect(instance.result).toBe(3);

    });

    it('instantiates an array-annotated constructor function', function(){
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);
        var injector = createInjector(['myModule']);
        
        function Type(one, two) {
            this.result = one + two;
        }

        var instance = injector.instantiate(['a', 'b', Type]);
        expect(instance.result).toBe(3);
    });

    it("instantiates a non-annotated constructor function", function(){
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);

        var injector = createInjector(['myModule']);
        function Type(a, b){
            this.result = a + b;
        }

        var instance = injector.instantiate(Type);
        expect(instance.result).toBe(3);
    });

    it("uses the prototype of the constructor when instantiating", function() {
        function BaseType() {
        }

        BaseType.prototype.getValue = _.constant(42);

        function Type() {
            this.v = this.getValue();
        }
        Type.prototype = BaseType.prototype;
        var module = angular.module('myModule', []);
        var injector = createInjector(['myModule']);

        var instance = injector.instantiate(Type);
        expect(instance.v).toBe(42);
    });

    it('supports locals when instantiating', function(){
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);
        var injector = createInjector(['myModule']);
        
        function Type(a, b){
            this.result = a + b;
        }

        var instance = injector.instantiate(Type, {b: 3});
        expect(instance.result).toBe(4);

    });

    it('allows registering a provider and use its $get', function(){
        var module = angular.module('myModule', []);
        module.provider('a', {
            $get: function(){
                return 42;
            }
        });

        var injector = createInjector(['myModule']);
        expect(injector.has('a')).toBe(true);
        expect(injector.get('a')).toBe(42);
    });

    it("injects the $get method of a provider", function(){
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        module.provider('b', {
            $get: function(a) {
                return a + 2;
            }
        });

        var injector = createInjector(['myModule']);
        expect(injector.get('b')).toBe(3);
    })

    it('inject the $get method of a provider lazily', function(){
        var module = angular.module('myModule', []);
        module.provider('b', {
            $get: function(a) {
                return a + 2;
            }
        });
        module.provider('a', {$get: _.constant(1)});

        var injector = createInjector(['myModule']);
        expect(injector.get('b')).toBe(3);
    });

    it('instantiates a dependency only once', function(){
        var module = angular.module('myModule', []);
        module.provider('a', {
            $get: function(){
                return {};
            }
        });
        var injector = createInjector(['myModule']);
        expect(injector.get('a')).toBe(injector.get('a'));
    });

    it("notifies the user about a circular dependency", function(){
        var module = angular.module('myModule', []);
        module.provider('a', {$get: function(b){}});
        module.provider('b', {$get: function(b){}});
        module.provider('c', {$get: function(b){}});
        
        var injector = createInjector(['myModule']);

        expect(function(){
            injector.get('a');
        }).toThrowError(/Circular dependency found/);
    });

    it("cleans up the circular marker when instantiation fails", function(){
        var module = angular.module('myModule', []);
        module.provider('a', {
            $get: function(){
                throw 'Failing instantiation'
            }
        });
        var injector = createInjector(['myModule']);
        expect(function(){
            injector.get('a');
        }).toThrow('Failing instantiation');
        expect(function(){
            injector.get('a');
        }).toThrow('Failing instantiation');
    });

    it("notifies the user about a circular dependency", function(){
        var module = angular.module('myModule', []);
        module.provider('a', {$get: function(b){}});
        module.provider('b', {$get: function(c){}});
        module.provider('c', {$get: function(a){}});

        var injector = createInjector(['myModule']);
        expect(function(){
            injector.get('a');
        }).toThrowError('Circular dependency found a <- c <- b <- a');
    });

    it('instantiates a provider if given as a constructor function', function(){
        var module = angular.module('myModule', []);
        module.provider('a', function Aprovider(){
            this.$get = function() {return 42;};
        });
        var injector = createInjector(['myModule']);
        expect(injector.get('a')).toBe(42);
    });

    it('injects the given provider constructor function', function(){
        var module = angular.module('myModule', []);
        module.constant('b', 2);
        module.provider('a', function Aprovider(b){
            this.$get = function(){return 1 + b}
        });
        var injector = createInjector(['myModule']);
        expect(injector.get('a')).toBe(3);
    });

    it("injects another provider to a provider constructor function", function(){
        var module = angular.module('myModule', []);

        module.provider('a', function Aprovider(){
            var value = 1;
            this.setValue = function(v) {
                value = v;
            };
            this.$get = function() {return value;};
        });

        /*注意这块是驼峰入参 */
        module.provider('b', function Bprovider(aProvider){
            aProvider.setValue(2);
            this.$get = function(){}
        });
        var injector = createInjector(['myModule']);
        expect(injector.get('a')).toBe(2);
    });
    
    it('does not inject an instance to a provider constructor function', function(){
        var module = angular.module('myModule', []);
        
        module.provider('a', function AProvider(){
            this.$get = function() { return 1;};
        });
        module.provider('b', function BProvider(a){
            this.$get = function(){return a;};
        });
        expect(function(){
            createInjector(['myModule']);
        }).toThrow();
    });

    it('does not inject a provider to a $get function', function(){
        var module = angular.module('myModule', []);
        module.provider('a', function AProvider(){
            this.$get = function() {return 1;};
        });
        module.provider('b', function BProvider(){
            this.$get = function(aProvider){ return aProvider.$get();};
        });

        var injector = createInjector(['myModule']);
        expect(function(){
            injector.get('b');
        }).toThrow();
    });

    it('does not inject a provider to invoke', function(){
        var module = angular.module('myModule', []);
        module.provider('a', function AProvider(){
            this.$get = function(){return 1;};
        });

        var injector = createInjector(['myModule']);
        expect(function(){
            injector.invoke(function(aProvider){});
        }).toThrow();
    });

    it("does not give access to providers through get", function(){
        var module = angular.module('myModule', []);

        module.provider('a', function AProvider(){
            this.$get = function() {return 1;};
        });
        var injector = createInjector(['myModule']);
        expect(function(){
            injector.get('aProvider');
        }).toThrow();
    });

    it("registers constants first to make them availabe to providers", function(){
        var module = angular.module('myModule', []);

        module.provider('a', function AProvider(b){
            this.$get = function() {
                return b;
            }
        });
        module.constant('b', 42);
        var injector = createInjector(['myModule']);
        expect(injector.get('a')).toBe(42);
    });

    //--------------chapter 12 high-level dependency injection features ----

    it('allows injecting the instance injector to $get', function(){
        var module = angular.module('myModule', []);
        module.constant('a', 42);

        module.provider('b', function BProvider(){
            this.$get = function($injector) {
                return $injector.get('a');
            }
        });

        var injector = createInjector(['myModule']);
        expect(injector.get('b')).toBe(42);
    });

    it("allows injecting the provider injector to provider", function(){
        var module = angular.module('myModule', []);

        module.provider('a', function AProvider(){
            this.value = 42;
            this.$get = function() {
                return this.value;
            };
        })
        module.provider('b', function BProvider($injector){
            var aProvider = $injector.get('aProvider');
            this.$get = function() {
                return aProvider.value;
            }
        });
        var injector = createInjector(['myModule']);
        expect(injector.get('b')).toBe(42);
    });

    it("allows injecting the $provide service to providers", function(){
        var module = angular.module('myModule', []);

        module.provider('a', function AProvider($provide){
            $provide.constant('b', 2);
            this.$get = function(b) {
                return 1 + b;
            }
        });
        var injector = createInjector(['myModule']);
        expect(injector.get('a')).toBe(3);
    });

    it("does not allow injecting the $provide service to $get", function(){
        var module = angular.module('myModule', []);
        module.provider('a', function AProvider(){
            this.$get = function($provide){};
        });
        var injector = createInjector(['myModule']);
        expect(function(){
            injector.get('a');
        }).toThrow();

    });

    it("runs config blocks when the injector is created", function(){
        var module = angular.module('myModule', []);
        var hasRun = false;
        module.config(function(){
            hasRun = true;
        });
        createInjector(['myModule']);
        expect(hasRun).toBe(true);
    });
    it("inject config blocks with provider injector", function(){
        var module = angular.module('myModule', []);

        module.config(function($provide){
            $provide.constant('a', 42);
        });
        var injector = createInjector(['myModule']);
        expect(injector.get('a')).toBe(42);
    });

    
})
/*
Genius JavaScript Library v0.0.1
(c) Cameron Edwards - http://www.geniusjs.com
License: GNU 3.0 (http://opensource.org/licenses/GPL-3.0)
*/

var genius = {};
(function () {
    //Utils
    (function () {
        genius.utils = {
            bind: function (fn, oThis) {
                var sliced = genius.utils.toArray(arguments).slice(1);
                if (Function.prototype.bind)
                    return Function.prototype.bind.apply(fn, sliced);

                if (typeof fn !== "function") {
                    // closest thing possible to the ECMAScript 5 internal IsCallable function
                    throw new TypeError("genius.utils.bind - what is trying to be bound is not callable");
                }

                var aArgs = Array.prototype.slice.call(arguments, 1),
                    fToBind = fn,
                    fNOP = function () { },
                    fBound = function () {
                        return fToBind.apply(fn instanceof fNOP && oThis
                                               ? fn
                                               : oThis,
                                             aArgs.concat(sliced));
                    };
                fNOP.prototype = this.prototype;
                fBound.prototype = new fNOP();

                return fBound;
            },
            cascadingGet: function (propName, sources) {
                for (var i = 0; i < sources.length; i++) {
                    if (sources[i] && sources[i].hasOwnProperty(propName)) {
                        var output = sources[i][propName];
                        return (!genius.utils.isNullOrUndefined(output) && output.isAccessor) ? output() : output;
                    }
                }
            },
            cases: {
                camelObject: function (obj) {
                    var copy = {};
                    for (var x in obj) {
                        var value = obj[x];
                        copy[genius.utils.cases.pascalToCamel(x)] =
                            typeof value == "object" ?
                                genius.utils.cases.camelObject(value) :
                                value;
                    }
                    return copy;
                },
                isCapitalized: function (str) {
                    return /[A-Z]/.test(str.charAt(0));
                },
                pascalToCamel: function (str) {
                    return str.charAt(0).toLowerCase() + str.substr(1);
                }
            },
            trim: function (str) {
                return str.replace(/^\s+/, "").replace(/\s+$/, "");
            },
            except: function (obj, exceptions) {
                var output = {};
                for (var x in obj) {
                    if (!genius.utils.contains(exceptions, x))
                        output[x] = obj[x];
                }
                return output;
            },
            random: function (min, max) {
                return (Math.random() * (max - min)) + min;
            },
            map: function (array, callback) {
                var copy = [];
                for (var i = 0; i < array.length; i++) {
                    copy[i] = callback.call(this, array[i]);
                }
                return copy;
            },
            isNullOrUndefined: function (value) {
                return typeof value == "undefined" || (typeof value == "object" && !value);
            },
            trace: function (depth) {
                var output = arguments.callee.caller;
                for (var i = 0; i < depth; i++) {
                    output = output.arguments.callee.caller;
                }
                console.log(output.toString());
            },
            partial: function (callback) {
                return function () {
                    return callback.apply(this, genius.utils.toArray(arguments).slice(1));
                };
            },
            toArray: function (iterable) {
                var arr = [];
                Array.prototype.push.apply(arr, iterable);
                return arr;
                //var arr = [];
                //for (var i = 0; i < iterable.length; i++) {
                //    arr.push(iterable[i]);
                //}
                //return arr;
            },
            accessor: function (value) {
                var output = function () {
                    if (arguments.length)
                        value = arguments[0];
                    return value;
                };
                output.isAccessor = true;
                return output;
            },
            extend: function (obj1, obj2) {
                for (var x in obj2) {
                    obj1[x] = obj2[x];
                }
                return obj1;
            },
            contains: function (haystack, needle) {
                return genius.utils.indexOf(haystack, needle) !== -1;
            },
            indexOf: function (haystack, needle) {
                if (Array.prototype.indexOf) {
                    return Array.prototype.indexOf.call(haystack, needle);
                } else {
                    for (var i = 0; i < haystack.length; i++) {
                        if (haystack[i] === needle)
                            return i;
                    }
                    return -1;
                }
            },
            once: function (func) {
                var called = false, result;
                var output = function (one, two, three) {
                    if (!called) {
                        called = true;
                        result = func.apply(this, arguments);
                    }
                    return result;
                };
                return output;
            }
        };
    }());

    //Config
    (function () {
        function Config() {
            this.ajax = {
                transformToCamelCase: genius.utils.accessor(false),
                parseJson: genius.utils.accessor(function (response) {
                    return genius.config.ajax.parseJs().call(this, JSON.parse(response));
                }),
                parseJs: genius.utils.accessor(function (response) {
                    return response;
                }),
                reset: function () {
                    this.transformToCamelCase(false);
                    this.parseJson(function (response) {
                        return genius.config.ajax.parseJs().call(this, JSON.parse(response));
                    });
                    this.parseJs(function (response) {
                        return response;
                    });
                }
            };
        };
        Config.prototype = {
            reset: function (options) {
                this.types.reset(options);
                this.ajax.reset(options);
            }
        };
        genius.config = new Config();
    }());

    //Dependency Injection
    (function () {
        function AttachedDependency(name, resource, box) {
            this.singleton = function () {
                box[name] = genius.utils.once(resource);
            };
            this.service = function () { };
            this.value = resource;
        };

        function DetachedDependency(resource) {
            this.service = function () { resource.value = resource; return resource; };
            this.singleton = function () {
                var output = genius.utils.once(resource);
                output.value = output;
                return output;
            };
            this.value = resource;
        };

        Object.reservedKeywords = (function () {
            var obj = {};
            var output = [];
            for (var x in obj) {
                output.push(x);
            }
            return output;
        }());

        function Modules() { }

        Modules.prototype = {
            register: function (name, module) {
                this[name] = module;
            }
        };

        Modules.reservedKeywords = ["register"].concat(Object.reservedKeywords);

        function Box() {
            this.kernel = new Kernel(this);
            this.modules = new Modules();
            var _self = this;
            this.kernel.add(this.modules.realDataModule);
        };
        Box.prototype = {
            set: function (name, resource) {
                this[name] = resource;
                return new AttachedDependency(name, resource, this);
            }
        };
        Box.reservedKeywords = ["kernel", "modules", "RouteProvider"].concat(Object.reservedKeywords);
        function Kernel(box) {
            var modules = [];
            this.add = function (module) {
                if (!genius.utils.contains(modules, module)) {
                    for (var x in module) {
                        if (!genius.utils.contains(Box.reservedKeywords, x)) {
                            box[x] = module[x].value;
                        }
                    }
                }
            };
            this.dependency = function (resource) {
                return new DetachedDependency(resource);
            };
            this.wipe = function (module) {
                for (var x in module) {
                    if (!genius.utils.contains(Box.reservedKeywords, x) && box[x] == module[x].value) {
                        delete box[x];
                    }
                }
            };
            this.reset = function () {
                this.wipe();
                //                Box.call(box);
            };
        };
        genius.box = new Box();
    }());

    var client = {
        parse: function (value, options) { return value; },
        set: function (value, options) {
            options.value = value;
            options.isDirty = options.current !== options.value;
            return options.value;
        }
    },
    server = {
        parse: function (value, options) {
            return options.parseServerInput.call(this, value, options.constr);
        },
        set: function (value, options) {
            options.value = value;
            options.isDirty = false;
            return options.value;
        }
    };

    var setUtils = client;

    //Types
    (function () {
        function TypeConfigSet() {
            this.boolean = new TypeConfig(false, false);
            this.string = new TypeConfig(false, "");
            this.date = new TypeConfig(true, function () { return new Date(); }, {
                parseServerInput: function (val) {
                    var regex = /^\d{4}\-\d{2}\-\d{2}T\d{2}\:\d{2}\:\d{2}\.\d{3}Z$/;
                    if (typeof val == "string" && regex.test(val)) {
                        val = genius.utils.trim(val.replace(/[^\d]/g, " "));
                        var split = genius.utils.map(val.split(/\s+/), parseInt);
                        return new Date(split[0], split[1] - 1, split[2], split[3], split[4], split[5]);
                    }
                    return val;
                },
                toQuery: function (val) {
                    return val.toISOString();
                }
            });
            this.collection = new TypeConfig(false, function (options) {
                var Collection = genius.Collection.extend({ type: options.genericType });
                return new Collection();
            }, {
                parseServerInput: function (val, type) {
                    return type.fromJs(val);
                }
            });
            this.number = new TypeConfig(false, 0);
            this.dynamic = new TypeConfig(true, null);
            this.custom = new TypeConfig(true, null, {
                parseServerInput: function (val, type) {
                    var output = new type();
                    for (var x in val) {
                        if (output[x]) {
                            if (output[x].backdoor) {
                                output[x].backdoor(val[x]);
                            } else if (output[x].isAccessor) {
                                output[x](val[x]);
                            } else if (typeof output[x] !== "function") {
                                output[x] = val[x];
                            }
                        } else {
                            output[x] = genius
                                .types
                                .dynamic()
                                .getInstance()
                                .initialize(val[x])
                                .accessor();
                        }
                    }
                    return output;
                }
            });
        };
        TypeConfigSet.permanentProperties = ["bool", "string", "date", "number", "dynamic", "custom", "add", "reset"];

        TypeConfigSet.prototype = {
            add: function (name, constr, options) {
                options = options || {};
                var camellized = genius.utils.cases.pascalToCamel(name);
                var config = this[camellized] = new TypeConfig(true, null, options);
                genius.types[camellized] = function () {
                    return new PlatonicType(options, constr, camellized, throwItClass);
                };
            },
            reset: function (options) {
                var deleteExtras = options && options.hard;
                for (var x in this) {
                    if (deleteExtras && !genius.utils.contains(TypeConfigSet.permanentProperties, x))
                        delete this[x];
                    else if (this[x].reset)
                        this[x].reset();
                }
                TypeConfigSet.call(this);
            }
        };

        var parseDefault = function (val) { return val; },
            toDefault = function (val) { return val; };
        function TypeConfig(nullable, defaultTo, options) {
            options = options || {};
            this.nullable = genius.utils.accessor(nullable);
            this.defaultTo = genius.utils.accessor(defaultTo);
            this.parseServerInput = genius.utils.accessor(options.parseServerInput || parseDefault);
            this.toQuery = genius.utils.accessor(options.toQuery || toDefault);
            this.toJs = genius.utils.accessor(options.toJs || toDefault);
            this.toJson = genius.utils.accessor(options.toJson || toDefault);

            var orig = [this.nullable(), this.defaultTo(), this.parseServerInput(), this.toQuery(), this.toJs(), this.toJson()];
            this.reset = function () {
                this.nullable(orig[0]);
                this.defaultTo(orig[1]);
                this.parseServerInput(orig[2]);
                this.toQuery(orig[3]);
                this.toJs(orig[4]);
                this.toJson(orig[5]);
            };
        };

        genius.config.types = new TypeConfigSet();

        function TypeOptions(options, constr, typeName, filter) {
            options = options || {};
            typeName = typeName || "custom";
            var config = genius.config.types[typeName];

            this.nullable = genius.utils.cascadingGet("nullable", [options, config]);
            if (typeof this.nullable == "undefined")
                this.nullable = true;

            var defaultTo = genius.utils.cascadingGet("defaultTo", [options, config]);
            this.defaultTo = typeof defaultTo == "function" ? defaultTo : function () { return defaultTo; };

            this.parseServerInput = genius.utils.cascadingGet("parseServerInput", [options, config]);

            this.typeName = typeName;
            this.constr = constr;
            this.toQuery = options.toQuery || config.toQuery;
            this.initialize = options.initialize || function () { return parseDefault; };
            this.filter = filter;
            this.value = this.defaultTo;
            this.genericType = options.type;
        };

        function PlatonicType(options, constr, typeName, filter) {
            options = new TypeOptions(options, constr, typeName, filter);
            options.filter(options.defaultTo(options), options, true);
            this.getInstance = function () {
                return new PlatonicInstance(genius.utils.extend({}, options));
            };
            this.nullable = function () { return options.nullable; };
            this.getDefault = options.defaultTo;
            this.constr = function () { return options.constr };
        };

        function accessor(options) {
            options.filter(options.value, options);
            options.isDirty = false;
            options.current = options.value;
            options.changeCallbacks = {};
            var output = function () {
                if (arguments.length) {
                    arguments[0] = setUtils.parse(arguments[0], options);
                    options.filter(arguments[0], options);
                    setUtils.set(arguments[0], options);
                    if (options.current !== options.value) {
                        for (var x in options.changeCallbacks)
                            options.changeCallbacks[x].call(this, options.current, options.value);
                        options.current = options.value;
                    }
                }
                return options.value;
            };

            var index = 0;
            genius.utils.extend(output, {
                subscribe: function (callback) {
                    options.changeCallbacks[index] = callback;
                    return index++;
                },
                unsubscribe: function (id) {
                    delete options.changeCallbacks[id];
                },
                toQuery: function () {
                    return options.toQuery().call(this, options.value);
                },
                isAccessor: true,
                nullable: function () {
                    return options.nullable;
                },
                defaultTo: options.defaultTo,
                isDirty: function () { return options.isDirty; }
            });
            return output;
        };

        function PlatonicInstance(options) {
            var _self = this;
            options.value = options.defaultTo(options);
            this.accessor = genius.utils.once(function () {
                return accessor(options);
            });
            this.initialize = genius.utils.once(function (value) {
                value = setUtils.parse(value, options);
                options.filter(value, options);
                options.value = options.current = value;
                return _self;
            });
        };

        function throwItType(value, options, nullable) {
            if (typeof value == options.typeName) return;
            if ((options.nullable || nullable) && genius.utils.isNullOrUndefined(value)) return;
            throw new TypeError("Value must be of type " + options.typeName + (options.nullable ? ", null, or undefined" : ""));
        };
        function throwItClass(value, options, nullable) {
            if (value instanceof options.constr) return;
            if ((options.nullable || nullable) && genius.utils.isNullOrUndefined(value)) return;
            throw new TypeError("Value must be of custom type " + options.constr.name + (options.nullable ? ", null, or undefined" : ""));
        };
        function throwItNull(value, options, nullable) {
            if (nullable)
                return;
            if (!options.nullable && genius.utils.isNullOrUndefined(value))
                throw new TypeError("Dynamic value cannot be null or undefined");
        };

        genius.types = function (constr, options) {
            return new PlatonicType(options, constr, "custom", throwItClass);
        };

        genius.utils.extend(genius.types, {
            string: function (options) {
                return new PlatonicType(options, String, "string", throwItType);
            },
            boolean: function (options) {
                return new PlatonicType(options, Boolean, "boolean", throwItType);
            },
            number: function (options) {
                return new PlatonicType(options, Number, "number", throwItType);
            },
            date: function (options) {
                return new PlatonicType(options, Date, "date", throwItClass);
            },
            collection: function (options) {
                return new PlatonicType({ type: options }, genius.Collection, "collection", throwItClass);
            },
            dynamic: function (options) {
                return new PlatonicType(options, function () {}, "dynamic", throwItNull);
            }
        });
    }());

    //Resource
    (function () {
        var resourceUtils = {
            getKey: function (options, typeOptions) {
                options = options || {};
                if (typeOptions.uniqKey) {
                    var key = resourceUtils.drillDown.call(this, options, typeOptions.uniqKey);
                    return key;
                }
            },
            getUrl: function () { },
            buildPrototype: function (prototype, typeOptions) {
                for (var x in typeOptions) {
                    if (typeof typeOptions[x] == "function") {
                        prototype[x] = typeOptions[x];
                    }
                }
                prototype.url = typeof typeOptions.url == "function" ?
                    typeOptions.url :
                    function () { return typeOptions.url || ""; };
            },
            setVarTyping: function (hash) {
                for (var x in hash) {
                    if (x !== "uniqKey" && x !== "url")
                        this[x] = hash[x];
                }
            },
            populateVar: function (x, value, innerConfig) {
                var toCamel = genius.config.ajax.transformToCamelCase();
                if (toCamel) {
                    if (genius.utils.cases.isCapitalized(x)) {
                        var camellized = genius.utils.cases.pascalToCamel(x);
                        resourceUtils.populateVar.call(this, camellized, value);
                        if (this[x])
                            this[x] = this[camellized];
                        return;
                    }
                    if (typeof value == "object")
                        value = genius.utils.cases.camelObject(value);
                }
                if (this[x] && this[x].getInstance) {
                    this[x] = this[x].getInstance().initialize(value).accessor();
                    this[x].subscribe(function () { innerConfig.isDirty = true; });
                } else if (typeof value == "function") {
                    this[x] = value;
                } else if (this[x] && this[x].backdoor) {
                    this[x].backdoor(value);
                } else if (this[x] && this[x].isAccessor) {
                    this[x](value);
                } else {
                    this[x] = genius.types.dynamic({ nullable: true }).getInstance().initialize(value).accessor();
                }

            },
            populateVars: function (options, innerConfig) {
                for (var x in options) {
                    resourceUtils.populateVar.call(this, x, options[x], innerConfig);
                }
                for (var x in this) {
                    if (typeof this[x].getInstance == "function") {
                        this[x] = this[x].getInstance().accessor();
                        this[x].subscribe(function () { innerConfig.isDirty = true; });
                    }
                    if (this[x].isAccessor && this[x]() && this[x]().backdoor) {
                        var placeholder = this[x];
                        this[x].backdoor = genius.utils.bind(function () {
                            return this().backdoor.apply(this(), arguments);
                        }, placeholder);
                    }
                }
            },
            drillDown: function (obj, str) {
                var split = str.split(".");
                var output = obj[split[0]];
                for (var i = 1; i < split.length; i++) {
                    if (!output[split[i]])
                        return;
                    output = output[split[i]].isAccessor ? output[split[i]]() : output[split[i]];
                }
                return output;
            },
            getInnerConfig: function (innerConfig, options) {
                if (innerConfig) {
                    innerConfig.optionsHash = options;
                    return innerConfig;
                } else {
                    return {
                        isDirty: true,
                        isNew: true,
                        isLoading: false,
                        isDeleted: false,
                        optionsHash: options
                    };
                }
            },
            initialize: function (innerConfig, options) {
                var callbacks = { none: {} }, index = 0,
                    subscribe = function (event, callback) {
                        if (!callbacks[event])
                            callbacks[event] = {};
                        callbacks[event][index] = callback;
                        return index++;
                    },
                    fire = function (event) {
                        var set;
                        if (set = callbacks[event]) {
                            for (var x in set) {
                                set[x].apply(this, genius.utils.toArray(arguments).slice(1));
                            }
                        }
                    };

                genius.utils.extend(this, {
                    subscribe: function (event, callback) {
                        switch (arguments.length) {
                            case 1:
                                return subscribe("none", event);
                            case 2:
                                return subscribe(event, callback);
                        }
                    },
                    unsubscribe: function (id) {
                        var output = false;
                        for (var x in callbacks) {
                            if (callbacks[x][id]) {
                                output = true;
                                delete callbacks[x][id];
                                break;
                            }
                        }
                        return output;
                    },
                    isDirty: function () { return innerConfig.isDirty; },
                    isNew: function () { return innerConfig.isNew; },
                    isDeleted: function () { return innerConfig.isDeleted; },
                    isLoading: function () { return innerConfig.isLoading; },
                    optionsHash: function () { return innerConfig.optionsHash; },
                    $delete: function () {
                        fire("delete");
                        function clearMe() {
                            for (var x in this)
                                if (this[x] && this[x].isAccessor)
                                    delete this[x];
                        }
                        if (innerConfig.isNew) {
                            clearMe.call(this);
                            innerConfig.isDeleted = true;
                        } else {
                            var url = genius.box.RouteProvider().createRoute(this.url(), this, false);
                            var _self = this;
                            innerConfig.isLoading = true;
                            genius.box.HttpBackend()
                                .del(url)
                                .done(function () { innerConfig.isDeleted = true; clearMe.call(_self); })
                                .always(function () { innerConfig.isLoading = false; });
                        }
                        return null;
                    },
                    $save: function () {
                        if (innerConfig.isDeleted)
                            throw new ReferenceError("You cannot save a deleted resource.");
                        if (innerConfig.isDirty) {
                            var provider = genius.box.RouteProvider(),
                                url = provider.createRoute(this.url(), this, false),
                                _self = this;
                            innerConfig.isLoading = true;
                            genius.box.HttpBackend()[innerConfig.isNew ? "post" : "put"](url, this.toJson())
                                .done(function (response) {
                                    response = genius.config.ajax.parseJson().call(this, response);
                                    setUtils = server;
                                    for (var x in response) {
                                        if (_self[x] && _self[x].backdoor) {
                                            _self[x].backdoor(response[x]);
                                            _self[x].isDirty(false);
                                        } else if (_self[x] && _self[x].isAccessor) {
                                            _self[x](response[x]);
                                            _self[x].isDirty(false);
                                        }
                                    }
                                    innerConfig.isDirty = innerConfig.isNew = false;
                                })
                                .always(function () { innerConfig.isLoading = false; });
                        }
                    }
                });

            }
        };
        var initializing;
        function Resource() { };
        Resource.fromJs = function (obj) {
            setUtils = server;
            var resource = new Resource(obj);
            setUtils = client;
            return resource;
        };
        Resource.prototype = {
            changedProperties: function () {
                var output = {};
                for (var x in this) {
                    if (this[x].isAccessor && this[x].isDirty())
                        output[x] = this[x]();
                }
                return output;
            },
            properties: function () {
                var output = {};
                for (var x in this) {
                    if (this[x].isAccessor)
                        output[x] = this[x];
                    else
                        continue;
                    if (output[x]() instanceof Resource)
                        output[x] = output[x].properties();
                }
                return output;
            },
            toJs: function () {
                var output = {};
                for (var x in this) {
                    if (this[x].toJs) {
                        output[x] = this[x].toJs();
                    }
                    else if (this[x].isAccessor) {
                        output[x] = this[x]();
                        if (output[x] instanceof Resource) {
                            output[x] = output[x].toJs();
                        }
                    }
                }
                return output;
            },
            toJson: function () {
                return JSON.stringify(this.toJs());
            }
        };
        Object.defineProperty(Resource.prototype, "pojo", {
            get: function () {
                return this.toJs();
            }
        });
        Resource.extend = function (typeOptions) {
            typeOptions = typeOptions || {};
            if (typeOptions.uniqKey && (field = typeOptions[typeOptions.uniqKey])) {
                if (!field.nullable())
                    throw new TypeError("Unique keys must be nullable");
                if (!genius.utils.isNullOrUndefined(field.getDefault()))
                    throw new TypeError("Unique keys must default to undefined or null");
            }

            initializing = true;
            var prototype = new this();
            initializing = false;

            resourceUtils.buildPrototype(prototype, typeOptions);

            var instances = {},
                innerConfig = null;
            function Resource(options) {
                if (!initializing) {
                    if (typeof this.init == "function")
                        this.init.apply(this, arguments);
                    function Resource() {
                        resourceUtils.setVarTyping.call(this, typeOptions);
                        resourceUtils.populateVars.call(this, options, resourceUtils.getInnerConfig(innerConfig, options));
                        var key;
                        if (key = resourceUtils.getKey(options, typeOptions)) {
                            var instance = instances[key];
                            if (instance) {
                                resourceUtils.populateVars.call(instance, options);
                                return instance;
                            }
                            instances[key] = this;
                        }
                    };
                    resourceUtils.initialize.call(this, resourceUtils.getInnerConfig(innerConfig, options), options);
                    Resource.prototype = this;
                    return new Resource();
                }
            };

            genius.utils.extend(Resource, {
                extend: arguments.callee,
                prototype: prototype,
                fromJs: function (obj) {
                    setUtils = server;
                    var resource = new this();
                    resourceUtils.populateVars.call(resource, obj, innerConfig);
                    setUtils = client;
                    return resource;
                },
                $get: function (data) {
                    var backend = genius.box.HttpBackend(),
                        url = genius.box.RouteProvider().createRoute(this.prototype.url(), data);

                    innerConfig = {
                        isNew: false,
                        isDirty: false,
                        isLoading: true,
                        isDeleted: false
                    };
                    var configHolder = innerConfig;
                    var output = new this(data);
                    innerConfig = null;
                    output.$promise = backend.get(url)
                        .done(function (response) {
                            var parsed = genius.config.ajax.parseJson().call(this, response);
                            if (typeOptions.parseServerInput)
                                parsed = typeOptions.parseServerInput(parsed);
                            setUtils = server;
                            resourceUtils.populateVars.call(output, parsed, configHolder);
                            setUtils = client;
                            configHolder.isDirty = false;
                        })
                        .always(function () {
                           configHolder.isLoading = false;
                        });
                    return output;
                },
                $query: function (data) {
                    data = data || {};
                    var Collection = genius.Collection.extend({ type: genius.types(Resource) });
                    var collection = new Collection();
                    var backend = genius.box.HttpBackend();
                    var url = genius.box.RouteProvider().createRoute(this.prototype.url(), data);
                    collection.$promise = backend.get(url)
                        .done(function (response) {
                            var parsed = genius.config.ajax.parseJson().call(this, response);
                            innerConfig = {
                                isNew: false,
                                isDirty: false,
                                isLoading: false,
                                isDeleted: false
                            };
                            setUtils = server;
                            collection.concat(parsed);
                            setUtils = client;
                            innerConfig = null;
                            collection.isLoading(false);
                        });
                    return collection;
                }
            });

            return Resource;
        };
        genius.Resource = Resource;

    }());

    //Collection
    (function () {
        function Collection(options) {
            options = options || {};
            this.push = function (val) {
                if (options.type) {
                    val = options.type.getInstance().initialize(val).accessor().call();
                }
                if (options.unique && genius.utils.contains(this, val))
                    return this.length;
                var output = (!options.unique || !genius.utils.contains(this, val)) ?
                    Array.prototype.push.call(this, val) :
                    this.length;
                return output;
            };
            this.addNew = function () {
                if (options.type) {
                    if (constr = options.type.constr())
                        this.push(new constr());
                    else
                        this.push(options.type.getInstance().accessor().call());
                } else {
                    this.push({});
                }
            };
            this.concat = function (arr) {
                if (options.type)
                    arr = genius.utils.map(arr, function (val) {
                        return options.type.getInstance().initialize(val).accessor().call();
                    });
                return Array.prototype.push.apply(this, arr);
            };
            this.removeAll = function () {
                this.splice(0);
            };
            this.remove = function (val) {
                var index;
                while ((index = genius.utils.indexOf(this, val)) !== -1) {
                    this.splice(index, 1);
                }
            };
        };
        Collection.prototype = [];
        Collection.fromJs = function (arr) {
            var collection = new genius.Collection();
            collection.concat(arr);
            return collection;
        };
        var initializing = false;
        Collection.extend = function (configOptions) {
            configOptions = configOptions || {};
            initializing = true;
            var prototype = new this();
            initializing = false;

            var type = configOptions.type,
                unique = configOptions.unique;

            prototype.toJs = function () {
                return genius.utils.map(this, function (val) { return val.toJs ? val.toJs() : val; }).slice(0, this.length);
            };
            prototype.initialize = function (arr) {
                markDirty = false;
                this.concat(arr);
                markDirty = true;
                return this;
            };
            prototype.accessor = function () {
                var _self = this;
                var output = function () {
                    if (arguments.length) {
                        _self.removeAll();
                        _self.concat(arguments[0]);
                        _self.isDirty(true);
                    }
                    return _self;
                }
                output.isAccessor = true;
                output.subscribe = this.subscribe;
                output.isDirty = this.isDirty;
                output.toJs = this.toJs.bind(this);
                return output;
            };
            prototype.addNew = function () {
                if (type) {
                    if (constr = type.constr())
                        this.push(new constr());
                    else
                        this.push(type.getInstance().accessor().call());
                } else {
                    this.push({});
                }
            };

            prototype.push = function (val) {
                if (type) {
                    val = type.getInstance().initialize(val).accessor().call();
                }
                if (unique && genius.utils.contains(this, val))
                    return this.length;
                if (val instanceof genius.Resource) {
                    var _self = this;
                    val.subscribe("delete", function () {
                        _self.remove(val);
                    });
                }
                var output = (!unique || !genius.utils.contains(this, val)) ?
                    Array.prototype.push.call(this, val) :
                    this.length;
                return output;
            };

            if (concat = Array.prototype.concat) {
                prototype.concat = function (arr) {
                    if (type)
                        arr = genius.utils.map(arr, function (val) {
                            val = type.getInstance().initialize(val).accessor().call();
                            if (val instanceof genius.Resource) {
                                var _self = this;
                                val.subscribe("delete", function () {
                                    _self.remove(val);
                                });
                            }
                            return val;
                        });
                    return Array.prototype.push.apply(this, arr);
                };
            }

            for (var x in configOptions) {
                if (typeof configOptions[x] == "function" && x !== "type")
                    prototype[x] = configOptions[x];
            }

            function Collection(options) {
                if (!initializing) {
                    options = options || {};
                    if (typeof this.init == "function")
                        this.init.apply(this, arguments);

                    if (options.type)
                        type = options.type;
                    if (options.unique)
                        unique = options.unique;
                    this.isLoading = genius.utils.accessor(true);
                    this.type = function () { return type; };
                    this.isDirty = genius.utils.accessor(false);
                    var changeCallbacks = {}, index = 0;
                    this.subscribe = function (callback) {
                        changeCallbacks[index] = callback;
                        return index++;
                    };
                    this.backdoor = function (arr) {
                        if (type)
                            arr = genius.utils.map(arr, function (val) {
                                return type.getInstance().initialize(val).accessor().call();
                            });
                        var args = [0, this.length];
                        args.push.apply(args, arr);
                        this.splice.apply(this, args);
                    };
                    this.fire = function () { };
                }
            };
            Collection.fromJs = function (arr) {
                var collection = new Collection();
                setUtils = server;
                var mapped = genius.utils.map(arr, function (val) {
                    return type.getInstance().initialize(val).accessor().call();
                });
                collection.concat(arr);
                setUtils = client;
                return collection;
            };
            Collection.prototype = prototype;
            Collection.extend = arguments.callee;
            return Collection;
        };
        genius.Collection = Collection;
    }());

    //Deferred
    (function () {
        function Deferred() {
            var doneCallbacks = [],
                failCallbacks = [],
                alwaysCallbacks = [],
                state = "pending";

            function Promise() {
                this.done = function (callback) {
                    if (typeof callback == "function") {
                        if (state == "resolved") {
                            callback.apply(this, arguments);
                            return this;
                        }
                        doneCallbacks.push(callback);
                    }
                    return this;
                };
                this.fail = function (callback) {
                    if (typeof callback == "function") {
                        if (state == "rejected") {
                            callback.apply(this, arguments);
                            return this;
                        }
                        failCallbacks.push(callback);
                    }
                    return this;
                };
                this.always = function (callback) {
                    if (typeof callback == "function") {
                        if (state !== "pending") {
                            callback.apply(this, arguments);
                            return this;
                        }
                        alwaysCallbacks.push(callback);
                    }
                    return this;
                };
                this.state = function () { return state; };
            };
            function fire(arr, args) {
                for (var i = 0; i < arr.length; i++) {
                    arr[i].apply(this, args);
                }
                for (var i = 0; i < alwaysCallbacks.length; i++) {
                    alwaysCallbacks[i].apply(this, args);
                }
            };

            this.resolve = function () {
                state = "resolved";
                fire.call(this, doneCallbacks, arguments);
            };
            this.reject = function () {
                state = "rejected";
                fire.call(this, failCallbacks, arguments);
            };
            var promise = new Promise();
            this.promise = function () { return promise; };
        };
        Deferred.prototype = {
            done: function () {
                return this.promise().done.apply(this, arguments);
            },
            fail: function () {
                return this.promise().fail.apply(this, arguments);
            },
            always: function () {
                return this.promise().always.apply(this, arguments);
            }
        };
        genius.deferred = function () { return new Deferred(); };
    }());

    //Fake Backend
    (function () {
        function RequestExpectation(backend, action, url) {
            this.toReturn = function (data) {
                backend.expectations[action + "-" + url] = data;
            };
        };
        function FakeBackend() {
            this.expectations = {};
            this.pendingRequests = {};
        };
        FakeBackend.prototype = (function () {
            function fakeRequest(action, url) {
                if (!this.expectations[action + "-" + url])
                    throw new ReferenceError("Unexpected request for " + url);
                var def = genius.deferred();
                this.pendingRequests[action + "-" + url] = def;
                return def.promise();
            }
            return {
                get: function (url) {
                    return fakeRequest.call(this, "get", url);
                },
                put: function (url) {
                    return fakeRequest.call(this, "put", url);
                },
                post: function (url) {
                    return fakeRequest.call(this, "post", url);
                },
                flush: function () {
                    for (var x in this.pendingRequests) {
                        this.pendingRequests[x].resolve(this.expectations[x]);
                        delete this.pendingRequests[x];
                    }
                },
                expectGet: function (url) {
                    return new RequestExpectation(this, "get", url);
                },
                expectPost: function (url) {
                    return new RequestExpectation(this, "post", url);
                },
                expectPut: function (url) {
                    return new RequestExpectation(this, "put", url);
                },
                expectDelete: function (url) {
                    return new RequestExpectation(this, "delete", url);
                }
            };
        }());
        genius.box.set("FakeHttpBackend", function () { return new FakeBackend(); }).singleton();
    }());

    //Real Backend
    (function () {
        function RealBackend() { };
        function req(url, method, body) {
            var def = genius.deferred();
            var xhr = genius.box.XHR();
            xhr.open(method, url, true);
            xhr.setRequestHeader("Accepts", "application/json");
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    def.resolve(xhr.responseText);
                }
            };
            xhr.send(body);
            return def.promise();
        };
        RealBackend.prototype = {
            get: function (url) {
                return req(url, "GET");
            },
            put: function (url, body) {
                return req(url, "PUT", body);
            },
            post: function (url, body) {
                return req(url, "POST", body);
            },
            del: function (url, body) {
                return req(url, "DELETE", body);
            }
        };
        genius.box.set("RealHttpBackend", function () { return new RealBackend(); });
    }());

    //AsyncQueue
    (function () {
        function AsyncQueue(func) {
            var running = false;
            var _self = this;
            var action = function () {
                func.call().always(function () {
                    if (running)
                        setTimeout(action, _self.buffer());
                });
            };

            this.start = function () { if (!running) { running = true; action(); } };
            this.stop = function () { running = false; };
            this.buffer = genius.utils.accessor(0);
        };
        genius.box.set("AsyncQueue", function () { return new AsyncQueue(); }).service();
    }());

    //RouteProvider
    (function () {
        function param(data) {
            var pairs = [];
            for (var x in data) {
                pairs.push(x + "=" + (data[x].toQuery ? data[x].toQuery() : data[x]));
            }
            return pairs.length ? "?" + pairs.join("&") : "";
        };
        function RouteProvider() { };
        RouteProvider.prototype = {
            createRoute: function (pattern, data, addQuery) {
                var regex = /\:([^\/\.\-]+)/gi;
                var match, output = pattern, alreadyMatched = [];
                while (match = regex.exec(pattern)) {
                    var capture = match[1], replacement;
                    if (data[capture])
                        replacement = data[capture].isAccessor && data[capture]() ? data[capture]() : (typeof data[capture] !== "function" ? data[capture] : "");
                    else
                        replacement = "";
                    output = output.replace(match[0], replacement);
                    alreadyMatched.push(match[1]);
                }
                if (/\/$/.test(output))
                    output = output.substr(0, output.length - 1);
                if (addQuery !== false)
                    output += param(genius.utils.except(data instanceof genius.Resource ? data.properties() : data, alreadyMatched));
                return output;
            }
        };
        genius.box.set("RouteProvider", function () { return new RouteProvider(); }).singleton();
    }());

    //XHR Object
    (function () {
        if (window.XMLHttpRequest) {
            genius.box.set("XHR", function () { return new XMLHttpRequest(); });
        } else if (window.ActiveXObject) {
            genius.box.set("XHR", function () { return new ActiveXObject("Microsoft.XMLHTTP"); });
        }

    }());

    //Setup
    (function () {
        genius.box.modules.register("realDataModule", {
            HttpBackend: genius.box.kernel.dependency(genius.box.RealHttpBackend)
        });
        genius.box.modules.register("testDataModule", {
            HttpBackend: genius.box.kernel.dependency(genius.box.FakeHttpBackend)
        });
        genius.box.kernel.add(genius.box.modules.realDataModule);
    }());

}());

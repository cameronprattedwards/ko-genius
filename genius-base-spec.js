var date = new Date();
while ((new Date() - date) < 2000);
console.log("starting");

genius.box.kernel.wipe(genius.box.modules.realDataModule);
genius.box.kernel.add(genius.box.modules.testDataModule);

describe("Plain classes", function () {
    it("should initialize custom class types", function () {
        var GeniusClass = genius.Resource.extend({});
        var PlainClass = function (options) {
            this.str = "I'm a string";
            this.num = 123;
            this.optionsHash = options;
        };

        PlainClass.prototype = {
            getString: function () { return "An arbitrary string"; },
            constructor: PlainClass
        };

        var TestClass = genius.Resource.extend({
            genius: genius.types(GeniusClass),
            plain: genius.types(PlainClass, { nullable: false })
        });
        //custom class types are nullable by default.

        expect(function () {
            new TestClass();
        }).toThrow();
        var myTestClass = new TestClass({
            plain: new PlainClass()
        });

        expect(myTestClass.genius()).toBe(null);
        expect(function () {
            myTestClass.genius(new PlainClass());
        }).toThrow();
        expect(myTestClass.genius()).toBe(null);
        var myGeniusClass = new GeniusClass();
        expect(function () { myTestClass.genius(myGeniusClass); }).not.toThrow();
        expect(myTestClass.genius()).toBe(myGeniusClass);

        var myPlainClass = myTestClass.plain();

        expect(myPlainClass instanceof PlainClass).toBe(true);
        expect(function () { myTestClass.plain(123); }).toThrow();
        expect(myTestClass.plain()).toBe(myPlainClass);
        expect(myPlainClass.options).toBeUndefined();
        expect(myPlainClass.str).toBe("I'm a string");
        expect(myPlainClass.getString()).toBe("An arbitrary string");

        var options = { option1: "abc", option2: "123" };
        var myPlainClass2 = new PlainClass(options);
        myTestClass.plain(myPlainClass2);
        expect(myTestClass.plain()).toBe(myPlainClass2);
        expect(myTestClass.plain().optionsHash).toBe(options);
    });
});

describe("Dynamics", function () {
    it("should accept any data for dynamic types", function () {
        var Class = genius.Resource.extend({
            dyno: genius.types.dynamic(),
            dynoRequired: genius.types.dynamic({ nullable: false }),
            dynoDefault: genius.types.dynamic({ nullable: false, defaultTo: "Dyno default" }),
            dynoDynamicDefault: genius.types.dynamic({ nullable: false, defaultTo: function () { return new Date(); } })
        });
        //       expect(function () { var myClass = new Class(); }).toThrow();
        var myClass = new Class({ dynoRequired: "Required dyno" });
        var testDate = new Date();
        expect(myClass.dynoRequired()).toBe("Required dyno");
        expect(function () { myClass.dyno(123); }).not.toThrow();
        expect(myClass.dyno()).toBe(123);
        expect(function () { myClass.dyno("abc"); }).not.toThrow();
        expect(function () { myClass.dynoDefault(null); }).toThrow();
        expect(myClass.dyno()).toBe("abc");
        expect(myClass.dynoDefault()).toBe("Dyno default");
        expect(testDate - myClass.dynoDynamicDefault()).toBeLessThan(50);
    });
});

describe("Type accessors", function () {
    it("should initialize to specified value", function () {
        var num = genius.types.number().getInstance().initialize(109).accessor();
        expect(num()).toBe(109);
        var str = genius.types.string().getInstance().initialize("My string").accessor();
        expect(str()).toBe("My string");
        var dyn = genius.types.dynamic().getInstance().initialize("Different string").accessor();
        expect(dyn()).toBe("Different string");
        var myDate = new Date();
        var date = genius.types.date().getInstance().initialize(myDate).accessor();
        expect(date()).toBe(myDate);
        function Panther() { };
        var myPanther = new Panther();
        var panther = genius.types(Panther).getInstance().initialize(myPanther).accessor();
        expect(panther()).toBe(myPanther);

        var Class = genius.Resource.extend({
            num: genius.types.number(),
            bool: genius.types.boolean(),
            str: genius.types.string(),
            dyn: genius.types.dynamic(),
            panther: genius.types(Panther)
        });
        var myClass = new Class({
            num: 10,
            bool: true,
            str: "String",
            dyn: "Another string",
            panther: new Panther()
        });
        expect(myClass.num()).toBe(10);
        expect(myClass.bool()).toBe(true);
        expect(myClass.str()).toBe("String");
        expect(myClass.dyn()).toBe("Another string");
        expect(myClass.panther()).toEqual(jasmine.any(Panther));
    });
});

describe("The genius box", function () {
    var Zombie, ZombieKing;
    beforeEach(function () {
        Zombie = genius.Resource.extend({
            eatingBrains: genius.types.boolean(),
            eatBrains: function () { this.eatingBrains(true); }
        });
        ZombieKing = Zombie.extend({
            administrating: genius.types.boolean(),
            ruleZombies: function () { this.administrating(true); }
        });
        genius.box.modules.register("zombieModule", {
            "Zombie": genius.box.kernel.dependency(function () { return new Zombie(); }),
            "ZombieKing": genius.box.kernel.dependency(function () { return new ZombieKing(); }).singleton()
        });
        genius.box.kernel.add(genius.box.modules.zombieModule);
    });

    afterEach(function () {
        genius.box.kernel.reset();
    });

    it("should accept and serve different data modules", function () {
        var zombie1 = genius.box.Zombie(),
            zombie2 = genius.box.Zombie();
        expect(zombie1).not.toBe(zombie2);
        expect(zombie1).toEqual(jasmine.any(Zombie));
        var king1 = genius.box.ZombieKing(),
            king2 = genius.box.ZombieKing();
        expect(king1).toBe(king2);
    });

    it("should unregister data modules", function () {
        genius.box.kernel.wipe(genius.box.modules.zombieModule);
        expect(genius.box.Zombie).toBeUndefined();
        expect(genius.box.ZombieKing).toBeUndefined();
    });

    it("should set singletons", function () {
        //This is poor practice - dependencies should be declared only within their own scopes.
        //But it's necessary for the instanceof test to work.
        function Singleton() {
            this.prop = "Property";
        };
        Singleton.prototype = {
            func: function () { return "Function"; }
        };
        genius.box.set("Singleton", function () { return new Singleton(); }).singleton();
        var singleton = genius.box.Singleton();
        var singleton2 = genius.box.Singleton();
        expect(singleton).toBe(singleton2);
        expect(singleton).toEqual(jasmine.any(Singleton));
    });

    it("should set services", function () {
        function Service() {
            this.prop = "Another property";
        };
        Service.prototype = {
            func: function () { return "Another function"; }
        };
        var factory = function () { return new Service(); };
        genius.box.set("Service", factory);
        genius.box.set("ServiceSpec", factory).service();
        expect(genius.box.Service).toBe(genius.box.ServiceSpec);
        expect(genius.box.Service()).toEqual(jasmine.any(Service));
        expect(genius.box.ServiceSpec()).toEqual(jasmine.any(Service));
        expect(genius.box.Service).toBe(factory);
    });
});

describe("Type specifications", function () {
    it("should initialize boolean types to booleans", function () {
        var Class = genius.Resource.extend({
            bool: genius.types.boolean(),
            nullable: genius.types.boolean({ nullable: true })
        });
        var myClass = new Class();
        expect(myClass.bool()).toBe(false);
        expect(function () { new Class({ bool: "string" }) }).toThrow();
        expect(function () {
            myClass.bool(null);
        }).toThrow();
        expect(function () { myClass.bool(undefined); }).toThrow();
        expect(function () {
            myClass.nullable(null);
        }).not.toThrow();
        expect(function () { myClass.nullable(undefined); }).not.toThrow();
    });

    it("should set options on custom class types", function () {
        var Class = genius.Resource.extend({
            jump: function () { return "I'm jumping"; }
        });
        var myClass = new Class({
            testNewString: "I'm a string"
        });
        expect(myClass.testNewString()).toBe("I'm a string");
        expect(myClass.jump()).toBe("I'm jumping");
    });

    //it("should return the root object on set", function () {
    //    var Class = genius.Resource.extend({
    //        prop: genius.types.string({ defaultTo: "Prop string" })
    //    });
    //    var myClass = new Class();
    //    expect(myClass.prop("Another string")).toBe(myClass);
    //    expect(myClass.prop()).toBe("Another string");
    //});

    it("should initialize number types to numbers", function () {
        var Class = genius.Resource.extend({
            plainNumber: genius.types.number(),
            nullableNumber: genius.types.number({ nullable: true }),
            nullNumber: genius.types.number({ nullable: true, defaultTo: null }),
            defaultNumber: genius.types.number({ defaultTo: 123 }),
            dynamicDefaultNumber: genius.types.number({ defaultTo: function () { return new Date().getTime(); } })
        });

        var myClass = new Class();
        var testDate = new Date();
        expect(myClass.plainNumber()).toBe(0);
        expect(myClass.nullableNumber()).toBe(0);
        expect(function () { myClass.nullableNumber(null); }).not.toThrow();
        expect(function () { myClass.nullableNumber(undefined); }).not.toThrow();
        expect(myClass.nullableNumber()).toBe(undefined);

        expect(myClass.nullNumber()).toBe(null);
        myClass.nullNumber(123);
        expect(myClass.nullNumber()).toBe(123);

        expect(myClass.defaultNumber()).toBe(123);
        expect(testDate.getTime() - myClass.dynamicDefaultNumber()).toBeLessThan(50);
    });

    it("should initialize string types to strings", function () {
        var Class = genius.Resource.extend({
            plainString: genius.types.string(),
            nullableString: genius.types.string({ nullable: true }),
            nullString: genius.types.string({ nullable: true, defaultTo: null }),
            defaultString: genius.types.string({ defaultTo: "Default string" }),
            dynamicDefaultString: genius.types.string({ defaultTo: function () { return new Date().getTime().toString(); } })
        });

        var myClass = new Class();
        var testDate = new Date();
        expect(myClass.plainString()).toBe("");
        expect(function () { myClass.plainString(null); }).toThrow();
        expect(function () { myClass.plainString(undefined); }).toThrow();
        expect(function () { myClass.plainString(123); }).toThrow();

        expect(myClass.nullableString()).toBe("");
        expect(function () { myClass.nullableString(null); }).not.toThrow();
        expect(function () { myClass.nullableString(undefined); }).not.toThrow();
        expect(function () { myClass.nullableString(123); }).toThrow();

        expect(myClass.nullString()).toBe(null);
        myClass.nullString("Some string");
        expect(myClass.nullString()).toBe("Some string");
        expect(function () { myClass.nullString(null); }).not.toThrow();
        expect(function () { myClass.nullString(undefined); }).not.toThrow();
        expect(function () { myClass.nullString(123); }).toThrow();

        expect(myClass.defaultString()).toBe("Default string");

        expect(parseInt(myClass.dynamicDefaultString()).toString()).not.toBe("NaN");
        expect(testDate - new Date(parseInt(myClass.dynamicDefaultString()))).toBeLessThan(50);

        var myInitializedClass = new Class({
            plainString: "Plain string",
            nullableString: "Nullable string",
            nullString: "Null string",
            defaultString: "Default string",
            dynamicDefaultString: "Dynamic default string"
        });
        expect(myInitializedClass.plainString()).toBe("Plain string");
        expect(myInitializedClass.nullableString()).toBe("Nullable string");
        expect(myInitializedClass.nullString()).toBe("Null string");
        expect(myInitializedClass.defaultString()).toBe("Default string");
        expect(myInitializedClass.dynamicDefaultString()).toBe("Dynamic default string");
    });

    it("should initialize date types to dates", function () {
        var defaultDate = new Date(2013, 1, 1);
        var Class = genius.Resource.extend({
            plainDate: genius.types.date(),
            nullableDate: genius.types.date({ nullable: true }),
            nullDate: genius.types.date({ nullable: true, defaultTo: null }),
            dateWithStaticDefault: genius.types.date({ defaultTo: defaultDate }),
            dateWithDynamicDefault: genius.types.date({ defaultTo: function () { return new Date(); } })
        });

        var myClass = new Class();
        expect(myClass.plainDate()).toEqual(jasmine.any(Date));
        expect(new Date() - myClass.plainDate()).toBeLessThan(50);
        expect(function () { myClass.plainDate(null); }).not.toThrow();
        expect(function () { myClass.plainDate(undefined); }).not.toThrow();
        expect(function () { myClass.plainDate("Not a date"); }).toThrow();

        expect(myClass.nullableDate()).toEqual(jasmine.any(Date));
        expect(new Date() - myClass.nullableDate()).toBeLessThan(50);
        expect(function () { myClass.nullableDate(null); }).not.toThrow();
        expect(function () { myClass.nullableDate(undefined); }).not.toThrow();

        expect(myClass.nullDate()).toBe(null);
        expect(myClass.dateWithStaticDefault()).toBe(defaultDate);
        //Be sure to include jasmine.clock.useMock
        expect(myClass.dateWithDynamicDefault()).not.toBe(defaultDate);

        //setTimeout(function () {
        //    var myClass2 = new Class();
        //    expect(new Date() - myClass2.dateWithDynamicDefault()).toBeLessThan(50);
        //});
    });

    it("should throw for typed defaults that aren't type safe", function () {
        function brokenNumClass() {
            genius.Resource.extend({
                num: genius.types.number({ defaultTo: "Not a number" })
            });
        };
        function brokenStringClass() {
            genius.Resource.extend({
                str: genius.types.string({ defaultTo: 1234 })
            });
        };
        function brokenDateClass() {
            genius.Resource.extend({
                date: genius.types.date({ defaultTo: "Garbage" })
            });
        };
        expect(brokenNumClass).toThrow();
        expect(brokenStringClass).toThrow();
        expect(brokenDateClass).toThrow();

        expect(function () {
            genius.Resource.extend({
                num: genius.types.number({ defaultTo: function () { return "Not a number."; } })
            });
        }).toThrow();
        expect(function () {
            genius.Resource.extend({
                str: genius.types.string({ defaultTo: function () { return 123; } })
            });
        }).toThrow();
        expect(function () {
            genius.Resource.extend({
                date: genius.types.date({ defaultTo: function () { return "Not a date."; } })
            });
        }).toThrow();
    });
});

describe("Observables", function () {
    it("should fire a change event", function () {
        var test = "Unchanged";
        var defaultDate = new Date();
        var mine = genius.types.date({ defaultTo: defaultDate }).getInstance().accessor();
        mine.subscribe(function () {
            test = "Changed";
        });
        mine(defaultDate);
        expect(test).toBe("Unchanged");
        mine(new Date());
        expect(test).toBe("Changed");
    });
});

describe("Genius config", function () {
    it("should allow transformation of JSON into camel case", function () {
        expect(genius.config.ajax.transformToCamelCase()).toBe(false);
        var json = JSON.stringify({
            TestVar: "Test Var",
            SubObj: {
                Test1: "Test 1",
                Test2: "Test 2"
            }
        });
        var backend = genius.box.HttpBackend();
        backend.expectGet("/class").toReturn(json);
        var Class = genius.Resource.extend({
            testVar: genius.types.string(),
            url: "/class"
        });
        var myClass = Class.$get({});
        backend.flush();
        expect(myClass.testVar()).toBe("");
        expect(myClass.TestVar()).toBe("Test Var");

        genius.config.ajax.transformToCamelCase(true);
        //we must redefine, since midstream changes can't change declared classes.
        var Class2 = genius.Resource.extend({
            testVar: genius.types.string(),
            url: "/class"
        });
        var myClass = Class2.$get({});
        backend.flush();
        expect(myClass.testVar()).toBe("Test Var");
        expect(myClass.TestVar).toBeUndefined();
        expect(myClass.subObj().test1).not.toBeUndefined();
        expect(myClass.subObj().test2).not.toBeUndefined();
        expect(myClass.subObj().Test1).toBeUndefined();
        expect(myClass.subObj().Test2).toBeUndefined();

        var Class3 = genius.Resource.extend({
            testVar: genius.types.string(),
            TestVar: genius.types.string(),
            url: "/class"
        });
        var myClass2 = Class3.$get({});
        backend.flush();
        expect(myClass2.testVar()).toBe("Test Var");
        expect(myClass2.TestVar()).toBe("Test Var");
        myClass2.testVar("Another var");
        expect(myClass2.testVar()).toBe("Another var");
        expect(myClass2.TestVar()).toBe("Another var");
        myClass2.TestVar("Last var");
        expect(myClass2.testVar()).toBe("Last var");
        expect(myClass2.TestVar()).toBe("Last var");
    });

    it("should set default parser on a type", function () {
        var dateParse = genius.config.types.date.parseServerInput(),
            numParse = genius.config.types.number.parseServerInput(),
            boolParse = genius.config.types.boolean.parseServerInput();
        genius.config.types.number.parseServerInput(function (input) {
            return parseInt(input);
        });
        genius.config.types.boolean.parseServerInput(function (input) {
            if (input == "True")
                return true;
            else
                return false;
        });
        function Panther(name, age, color) {
            this.name = name + "Pantherson";
            this.age = age + 2;
            this.color = color;
        };
        genius.config.types.add("panther", Panther, {
            parseServerInput: function (input) {
                return new Panther(input.name, input.age, input.color);
            }
        });
        var timestamp = 1387521272839;
        genius.config.types.date.parseServerInput(function (input) {
            return new Date(parseInt(input));
        });
        var pantherConfig = genius.config.types.panther;
        var Class = genius.Resource.extend({
            date: genius.types.date(),
            num: genius.types.number(),
            bool: genius.types.boolean(),
            panther: genius.types.panther(),
            url: "/myclass"
        });
        var json = JSON.stringify({
            date: timestamp,
            num: "10191",
            bool: "True",
            panther: {
                name: "Pansy",
                age: 20,
                color: "black"
            }
        });
        var backend = genius.box.HttpBackend();
        backend.expectGet("/myclass").toReturn(json);
        var myClass = Class.$get();
        backend.flush();
        expect(myClass.date().getTime()).toBe(timestamp);
        expect(myClass.num()).toBe(10191);
        expect(myClass.bool()).toBe(true);
        expect(myClass.panther() instanceof Panther).toBe(true);

        genius.config.reset();

        //All parsing methods should be reset to their originals,
        //But new custom types will remain, unless {hard: true} is
        //specified on reset.
        expect(genius.config.types.boolean.parseServerInput()).toBe(boolParse);
        expect(genius.config.types.date.parseServerInput().toString()).toEqual(dateParse.toString());
        expect(genius.config.types.number.parseServerInput()).toBe(numParse);
        expect(genius.config.types.panther).toBe(pantherConfig);
        genius.config.reset({ hard: true });
        expect(genius.config.types.panther).toBeUndefined();
    });

    it("should toggle default nullability of types", function () {
        function testInit() {
            expect(genius.config.types.date.nullable()).toBe(true);
            expect(genius.config.types.custom.nullable()).toBe(true);
            expect(genius.config.types.boolean.nullable()).toBe(false);
        }
        testInit();
        genius.config.types.date.nullable(true);
        genius.config.types.custom.nullable(false);
        genius.config.types.boolean.nullable(false);

        var ChildClass = function () { };
        var Class = genius.Resource.extend({
            date: genius.types.date(),
            child: genius.types(ChildClass),
            bool: genius.types.boolean()
        });
        expect(function () { new Class(); }).toThrow();
        var myClass = new Class({ child: new ChildClass(), num: 19 });
        expect(function () { myClass.date(null) }).not.toThrow();
        expect(myClass.date()).toBe(null);
        expect(myClass.num()).toBe(19);
        expect(function () { myClass.bool(null); }).toThrow();
        genius.config.reset();
        testInit();
    });

    it("should change default values for types", function () {
        function testInit() {
            expect(genius.config.types.number.defaultTo()).toBe(0);
            expect(typeof genius.config.types.date.defaultTo()).toBe("function");
            expect(new Date() - genius.config.types.date.defaultTo()()).toBeLessThan(50);
            expect(genius.config.types.boolean.defaultTo()).toBe(false);
        };
        testInit();
        genius.config.types.number.defaultTo(19);
        var testDate = new Date(2013, 1, 1);
        genius.config.types.boolean.defaultTo(true);
        genius.config.types.date.defaultTo(testDate);

        var Class = genius.Resource.extend({
            num: genius.types.number(),
            date: genius.types.date(),
            bool: genius.types.boolean()
        });
        var myClass = new Class();
        expect(myClass.num()).toBe(19);
        expect(myClass.date()).toBe(testDate);
        expect(myClass.bool()).toBe(true);
        genius.config.types.date.defaultTo(function () { return new Date(2013, 1, 1); });
        genius.config.types.number.defaultTo(function () { return new Date().getTime(); });
        //As a discouragement for reconfiguring midstream, types defined before reconfiguration will not be reconfigured.
        expect(myClass.date()).toBe(testDate);
        var Class2 = genius.Resource.extend({
            num: genius.types.number(),
            date: genius.types.date()
        });
        var myClass2 = new Class2();
        var class2Date = myClass2.date();
        expect(class2Date).not.toBe(testDate);
        expect(class2Date.getFullYear()).toBe(2013);
        expect(class2Date.getMonth()).toBe(1);
        expect(class2Date.getDate()).toBe(1);
        expect(new Date().getTime() - myClass2.num()).toBeLessThan(50);

        genius.config.reset();
        testInit();
    });
});

describe("A deferred", function () {
    var test, test2, test3, test4, deferred;
    function init() {
        test = "One string";
        test2 = "Two string";
        test3 = "";
        test4 = "";
        deferred = genius.deferred();
        deferred
            .done(function (var1, var2) { test = "Red string " + var1 + " and " + var2; })
            .done(function (var1, var2) { test2 = "Blue string " + var1 + " and " + var2; })
            .fail(function (var1, var2) { test = "Green string " + var1 + " and " + var2; })
            .fail(function (var1, var2) { test2 = "Yellow string " + var1 + " and " + var2; })
            .always(function (var1, var2) { test3 = "Orange string " + var1 + " and " + var2; })
            .always(function (var1, var2) { test4 = "Violet string " + var1 + " and " + var2; });
    }

    beforeEach(function () {
        init();
    });

    it("should supply promises", function () {
        var test1 = "", test2 = "";
        var promise = deferred.promise();
        promise.done(function () { test1 = "Success"; }).fail(function () { test1 = "Failure"; }).always(function () { test2 = "Complete"; });
        deferred.resolve();
        expect(test1).toBe("Success");
        expect(test2).toBe("Complete");
    });

    it("should execute success callbacks on resolve()", function () {
        expect(test).toBe("One string");
        expect(test2).toBe("Two string");
        deferred.resolve("Good", "Happiness");
        expect(test).toBe("Red string Good and Happiness");
        expect(test2).toBe("Blue string Good and Happiness");
    });

    it("should execute fail callbacks on reject()", function () {
        deferred.reject("Bad", "Sadness");
        expect(test).toBe("Green string Bad and Sadness");
        expect(test2).toBe("Yellow string Bad and Sadness");
    });

    it("should execute always callbacks on reject() or resolve()", function () {
        deferred.resolve("Good", "Happiness");
        expect(test3).toBe("Orange string Good and Happiness");
        expect(test4).toBe("Violet string Good and Happiness");
        init();
        deferred.reject("Bad", "Sadness");
        expect(test3).toBe("Orange string Bad and Sadness");
        expect(test4).toBe("Violet string Bad and Sadness");
    });
});

describe("Resources", function () {
    it("should allow retrieval of their original options hashes", function () {
        var Class = genius.Resource.extend({});

        var options = {
            str: "A string",
            num: 123,
            date: new Date(2013, 0, 1),
            obj: { something: "something else" }
        };
        var myClass = new Class(options);
        expect(myClass.optionsHash()).toBe(options);
    });

    it("should allow serialization to plain old JavaScript objects", function () {
        var Sub = genius.Resource.extend({
            num: genius.types.number({ defaultTo: 19 }),
            name: genius.types.string({ defaultTo: "Cameron" })
        });

        var Class = genius.Resource.extend({
            date: genius.types.date(),
            num: genius.types.number(),
            bool: genius.types.boolean(),
            sub: genius.types(Sub, { defaultTo: function () { return new Sub(); } })
        });
        var myClass = new Class();
        var date = myClass.date();
        expect(date instanceof Date).toBe(true);
        expect(myClass.toJs()).toEqual({
            date: date,
            num: 0,
            bool: false,
            sub: {
                num: 19,
                name: "Cameron"
            }
        });
        var sub = new Sub({ name: "Josephus" });
        var myClass2 = new Class({ date: new Date(2013, 0, 1), num: 149, bool: true, sub: sub });
        date = myClass2.date();
        var comparer = {
            date: date,
            num: 149,
            bool: true,
            sub: {
                num: 19,
                name: "Josephus"
            }
        };
        expect(myClass2.toJs()).toEqual(comparer);
    });
});

describe("Unique models", function () {
    it("should ensure uniqueness by some key", function () {
        //A unique key must be nullable.
        genius.config.types.number.defaultTo(null);
        expect(function () {
            var Class = genius.Resource.extend({
                uniqKey: "id",
                id: genius.types.number({ nullable: false })
            });
        }).toThrow();
        genius.config.reset();
        //A unique key must be a number or string
        expect(function () {
            genius.Resource.extend({
                uniqKey: "id",
                id: genius.types.date()
            });
        });
        var Sub = genius.Resource.extend({
            uniqKey: "id",
            id: genius.types.number({ nullable: true, defaultTo: null })
        });
        var Class = genius.Resource.extend({
            uniqKey: "sub.id",
            sub: genius.types(Sub)
        });
        var myClass = new Class({
            sub: new Sub({ id: 9 })
        });
        var myClass2 = new Class({
            sub: new Sub({ id: 9 }),
            frenchFries: "delicious"
        });
        expect(myClass).toBe(myClass2);
        expect(myClass2.frenchFries()).toBe("delicious");
    });
});

describe("Getters and setters", function () {
    it("should create a hash of dirty properties", function () {
        var Obj = function () { };

        var Class = genius.Resource.extend({
            str: genius.types.string(),
            num: genius.types.number(),
            date: genius.types.date(),
            obj: genius.types(Obj)
        });

        var myClass = new Class({
            str: "Init string",
            num: 10,
            date: new Date(),
            obj: new Obj()
        });

        var testDate = new Date();
        expect(myClass.changedProperties()).toEqual({});
        myClass.str("Another string");
        myClass.date(testDate);
        expect(myClass.changedProperties()).toEqual({ str: "Another string", date: testDate });
    });

    it("should mark changed variables as dirty", function () {
        var Class = genius.Resource.extend({
            test: genius.types.boolean()
        });
        var myClass = new Class();
        expect(myClass.test()).toBe(false);
        expect(myClass.isDirty()).toBe(true);
        expect(myClass.test.isDirty()).toBe(false);
        myClass.test(false);
        expect(myClass.test.isDirty()).toBe(false);
        expect(myClass.isDirty()).toBe(true);
        myClass.test(true);
        expect(myClass.test.isDirty()).toBe(true);
        expect(myClass.isDirty()).toBe(true);
    });
});

describe("Parsers", function () {
    it("should parse input hash into property", function () {
        var backend = genius.box.HttpBackend();
        backend.expectGet("/classyclass").toReturn(JSON.stringify({ date: [2013, 0, 1] }));
        var Class = genius.Resource.extend({
            date: genius.types.date({
                parseServerInput: function (input) {
                    return new Date(input[0], input[1], input[2]);
                }
            }),
            url: "/classyclass"
        });
        var myClass = Class.$get();
        backend.flush();
        var date = myClass.date();
        expect(date.getFullYear()).toBe(2013);
        expect(date.getMonth()).toBe(0);
        expect(date.getDate()).toBe(1);

        var myClass2 = new Class();
        expect(new Date() - myClass2.date()).toBeLessThan(50);
    });
});

describe("Constructors", function () {
    it("should be called on creation of resource", function () {
        var Class = genius.Resource.extend({
            init: function (options) {
                this.arbitrary = "Arbitrary string";
                this.hash = JSON.stringify(options);
            }
        });
        var options = { prop: "value" };
        var myClass = new Class(options);
        expect(myClass.arbitrary).toBe("Arbitrary string");
        expect(myClass.hash).toBe(JSON.stringify(options));
    });
});

describe("A collection", function () {
    var Class;
    beforeEach(function () {
        Class = genius.Resource.extend({
            uniqKey: "id",
            id: genius.types.number({ nullable: true, defaultTo: null }),
            name: genius.types.string({ defaultTo: "Cameron" })
        });
    });

    it("should allow class inheritance", function () {
        var Collection = genius.Collection.extend({ type: genius.types(Class), unique: false });
        var collection = new Collection();
        expect(typeof collection.push).toBe("function");
    });

    it("should parse queries properly", function () {
        var backend = genius.box.HttpBackend();
        backend.expectGet("/classes/1").toReturn("{\"colors\":[\"red\",\"blue\",\"yellow\",\"green\"], \"shapes\":[\"triangle\",\"square\",\"hexagon\"]}");
        var Class = genius.Resource.extend({
            colors: genius.types.collection(genius.types.string()),
            shapes: genius.types.collection(genius.types.string()),
            url: "/classes/:id"
        });
        var myClass = Class.$get({ id: 1 });
        backend.flush();
        expect(myClass.colors().length).toBe(4);
        expect(myClass.shapes().length).toBe(3);
        var colors = myClass.colors(), shapes = myClass.shapes();
        expect(colors[0]).toBe("red");
        expect(colors[1]).toBe("blue");
        expect(colors[2]).toBe("yellow");
        expect(colors[3]).toBe("green");
        expect(shapes[0]).toBe("triangle");
        expect(shapes[1]).toBe("square");
        expect(shapes[2]).toBe("hexagon");
    });
});

describe("The route provider", function () {
    it("should parse route data into routes", function () {
        var prov = genius.box.RouteProvider();
        var pattern = "/api/:controller/:action/:id", data = { controller: "zombies", action: "munch", id: 19 };
        expect(prov.createRoute(pattern, data)).toBe("/api/zombies/munch/19");

        pattern = "/:first-:last/:age";
        data = { first: "cameron", last: "edwards", age: 25 };
        expect(prov.createRoute(pattern, data)).toBe("/cameron-edwards/25");

        pattern = "/api/:controller/:action.json";
        data = { controller: "deer", action: "prance" };
        expect(prov.createRoute(pattern, data)).toBe("/api/deer/prance.json");

        pattern = "/:attempt/:look/:discover";
        data = { attempt: "strive", look: "seek", discover: "find", not: "to-yield" };
        expect(prov.createRoute(pattern, data)).toBe("/strive/seek/find?not=to-yield");

        pattern = "/api";
        data = { controller: "zombies", action: "munch", id: 1091 };
        expect(prov.createRoute(pattern, data)).toBe("/api?controller=zombies&action=munch&id=1091");

        pattern = "/api/adventures/:id/:action/:secondaryId";
        data = {};
        expect(prov.createRoute(pattern, data)).toBe("/api/adventures");

        data = { id: 1, action: "jump", secondaryId: 3, slopmonkey: "cram", jub: undefined };
        expect(prov.createRoute(pattern, data)).toBe("/api/adventures/1/jump/3?slopmonkey=cram");

        var Class = genius.Resource.extend({ id: genius.types.number(), name: genius.types.string(), date: genius.types.date() });
        var date = new Date(), dateStr = date.toISOString();
        pattern = "/api/:id/:name";
        data = new Class({ id: 11, name: "Jimmy", date: date });
        expect(prov.createRoute(pattern, data)).toBe("/api/11/Jimmy?date=" + dateStr);
    });
});

describe("Resource requests", function () {
    var Zombie, backend;
    beforeEach(function () {

        backend = genius.box.HttpBackend();
    });

    it("should handle custom types on return from $save", function () {
        var Toy = genius.Resource.extend({
            name: genius.types.string(),
            verb: genius.types.string(),
            weight: genius.types.number()
        });
        Zombie = genius.Resource.extend({
            url: "/api/zombies/:id",
            uniqKey: "id",
            name: genius.types.string(),
            id: genius.types.number({ nullable: true, defaultTo: null }),
            rand: genius.types.number(),
            parseServerInput: function (response) {
                return response.zombie;
                //return genius.config.types.custom.parseServerInput().call(this, response.zombie);
            },
            favoriteToy: genius.types(Toy)
        });
        backend.expectGet("/api/zombies/4").toReturn("{\"success\": true, \"zombie\": {\"name\": \"Vladimir\", \"id\": 4, \"rand\": 3939,\"favoriteToy\":{\"name\":\"hacksaw\",\"verb\":\"hack\",\"weight\":15}}}");
        backend.expectPut("/api/zombies/4").toReturn("{\"success\": true, \"zombie\": {\"name\": \"Horowitz\", \"id\": 4, \"rand\": 3939,\"favoriteToy\":{\"name\":\"hacksaw\",\"verb\":\"hack\",\"weight\":15}}}");
        var zombie = Zombie.$get({ id: 4 });
        backend.flush();
        expect(zombie.favoriteToy()).toEqual(jasmine.any(Toy));

        zombie.name("Horowitz");
        zombie.$save();
        expect(zombie.favoriteToy()).toEqual(jasmine.any(Toy));
        expect(zombie.name()).toBe("Horowitz");
    });

    it("should call the resource's custom parse method", function () {
        Zombie = genius.Resource.extend({
            url: "/api/zombies/:id",
            uniqKey: "id",
            name: genius.types.string(),
            id: genius.types.number({ nullable: true, defaultTo: null }),
            rand: genius.types.number(),
            parseServerInput: function (response) {
                return response.zombie;
                //return genius.config.types.custom.parseServerInput().call(this, response.zombie);
            }
        });
        backend.expectGet("/api/zombies/4").toReturn("{\"success\": true, \"zombie\": {\"name\": \"Vladimir\", \"id\": 4, \"rand\": 3939}}");
        var zombie = Zombie.$get({ id: 4 });
        backend.flush();
        expect(zombie.isNew()).toBe(false);
        expect(zombie.name()).toBe("Vladimir");
        expect(zombie.id()).toBe(4);
        expect(zombie.rand()).toBe(3939);
        //You can always modify genius.Resource.prototype.parse if you're feeling brave.
    });

    it("should save old resources with PUT", function () {
        Zombie = genius.Resource.extend({
            url: "/api/zombies/:id",
            uniqKey: "id",
            name: genius.types.string(),
            id: genius.types.number({ nullable: true, defaultTo: null }),
            rand: genius.types.number(),
            birthday: genius.types.date()
        });
        backend.expectGet("/api/zombies/3").toReturn("{\"name\": \"Malvolio\", \"id\": 3, \"rand\": 5757}");
        backend.expectPut("/api/zombies/3").toReturn("{\"name\": \"Mercutio\", \"id\": 3, \"rand\": 4598, \"birthday\": \"1992-04-17T12:00:00.000Z\"}");
        var zombie = Zombie.$get({ id: 3 });
        expect(zombie.isLoading()).toBe(true);
        expect(zombie.id()).toBe(3);
        backend.flush();

        expect(zombie.isNew()).toBe(false);
        expect(zombie.isLoading()).toBe(false);
        expect(zombie.name()).toBe("Malvolio");
        expect(zombie.rand()).toBe(5757);
        zombie.name("Mercutio");
        expect(zombie.isDirty()).toBe(true);
        expect(zombie.name.isDirty()).toBe(true);
        zombie.$save();
        expect(zombie.isLoading()).toBe(true);
        backend.flush();

        var birthday = zombie.birthday();
        expect(birthday.getFullYear()).toBe(1992);
        expect(birthday.getMonth()).toBe(3);
        expect(birthday.getDate()).toBe(17);

        expect(zombie.name()).toBe("Mercutio");
        expect(zombie.rand()).toBe(4598);
        expect(zombie.isDirty()).toBe(false);
        expect(zombie.name.isDirty()).toBe(false);
    });

    it("should save new resources with POST", function () {
        backend.expectPost("/api/zombies").toReturn("{\"name\": \"Muncher\", \"id\": 1, \"rand\": 1091}");
        var zombie = new Zombie({
            name: "Muncher",
            rand: 98238
        });
        expect(zombie.isNew()).toBe(true);
        zombie.$save();
        expect(zombie.isLoading()).toBe(true);
        backend.flush();

        expect(zombie.id()).toBe(1);
        expect(zombie.rand()).toBe(1091);
        expect(zombie.isLoading()).toBe(false);
    });

    it("should fail to request deletion with new resources", function () {
        var zombie = new Zombie({
            name: "Harold",
            rand: 2630
        });
        var deletedZombie = zombie.$delete();
        expect(deletedZombie).toBe(null);

        expect("name" in zombie).toBe(false);
        expect("rand" in zombie).toBe(false);
        expect("id" in zombie).toBe(false);

        expect(zombie.isDeleted()).toBe(true);
        expect(zombie.$save).toThrow();
    });

    it("should delete resources with DELETE", function () {
        backend.flush();
        backend.expectGet("/api/zombies/3").toReturn("{\"name\": \"Malvolio\", \"id\": 3, \"rand\": 5757}");
        backend.expectDelete("/api/zombies/3").toReturn("null");
        var zombie = Zombie.$get({ id: 3 });
        backend.flush();
        //I can't really think of a good way to test this.
    });

    it("should call the config's custom parse method", function () {
        backend.flush();
        genius.config.ajax.parseJs(function (response) {
            return response.data;
        });
        backend.expectGet("/api/zombies/5").toReturn("{\"success\": true, \"errors\": [], \"data\": {\"name\": \"Jeanne\", \"id\": 5, \"rand\": 4801}}");
        var zombie = Zombie.$get({ id: 5 });
        expect(zombie.isNew()).toBe(false);
        backend.flush();
        expect(zombie.isNew()).toBe(false);
        expect(zombie.name()).toBe("Jeanne");
        expect(zombie.rand()).toBe(4801);
        expect(zombie.errors).toBeUndefined();

        genius.config.reset();
        expect(genius.config.ajax.parse).toBeUndefined();
    });
});

describe("Resources awaiting server return", function () {
    it("should initialize typed variables immediately", function () {
        var backend = genius.box.HttpBackend();
        backend.flush();
        var Zombie = genius.Resource.extend({
            name: genius.types.string(),
            age: genius.types.number(),
            birthday: genius.types.date(),
            id: genius.types.number({ nullable: true, defaultTo: null }),
            uniqKey: "id",
            url: "/zombies/:id"
        });
        backend.expectGet("/zombies/1").toReturn("{\"name\":\"Zombo\",\"age\":19,\"birthday\":\"1994-05-17T04:00:00.000Z\",\"id\":1}");
        var zombo = Zombie.$get({ id: 1 });
        var nameHolder = zombo.name, ageHolder = zombo.age, dayHolder = zombo.birthday;
        expect(zombo.name()).toBe("");
        expect(zombo.age()).toBe(0);
        expect(new Date() - zombo.birthday()).toBeLessThan(50);
        backend.flush();

        expect(zombo.name()).toBe("Zombo");
        expect(zombo.age()).toBe(19);
        expect(zombo.birthday().getFullYear()).toBe(1994);
        expect(zombo.id()).toBe(1);
        expect(zombo.name).toBe(nameHolder);
        expect(zombo.age).toBe(ageHolder);
        expect(zombo.birthday).toBe(dayHolder);
    });
});

describe("Deeply nested collections", function () {
    it("should set class methods on all objects", function () {
        var Neuron = genius.Resource.extend({
            fire: function () {
                console.log("I'm firing.");
            }
        });

        var Brain = genius.Resource.extend({
            neurons: genius.types.collection(genius.types(Neuron))
        });

        var Zombie = genius.Resource.extend({
            brains: genius.types.collection(genius.types(Brain)),
            url: "/zombies/:id"
        });

        var backend = genius.box.HttpBackend();
        backend.expectGet("/zombies/1").toReturn("{\"brains\":[{\"neurons\":[{},{},{}]}]}");
        var zombie = Zombie.$get({ id: 1 });
        backend.flush();
        var brains = zombie.brains(), neurons = brains[0].neurons();
        expect(brains.length).toBe(1);
        expect(neurons.length).toBe(3);
        expect(typeof neurons[0].fire).toBe("function");
        expect(typeof neurons[1].fire).toBe("function");
        expect(typeof neurons[2].fire).toBe("function");
    });
});
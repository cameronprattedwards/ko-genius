describe("Accessors", function () {
    it("should be ko.observables", function () {
        var Zombie = genius.Resource.extend({
            id: genius.types.number(),
            name: genius.types.string(),
            date: genius.types.date(),
            dynamic: genius.types.dynamic(),
            boolean: genius.types.boolean()
        });
        var zombie = new Zombie({
            id: 1,
            name: "Zombo",
            date: new Date(2013, 1, 1),
            dynamic: 10819,
            boolean: true
        });
        expect(ko.isObservable(zombie.id)).toBe(true);
        expect(ko.isObservable(zombie.name)).toBe(true);
        expect(ko.isObservable(zombie.date)).toBe(true);
        expect(ko.isObservable(zombie.dynamic)).toBe(true);
        expect(ko.isObservable(zombie.boolean)).toBe(true);
    });
});

describe("Resource flags", function () {
    it("should be ko.observables", function () {
        var Zombie = genius.Resource.extend({
            id: genius.types.number(),
            url: "/zombies/:id"
        });
        var backend = genius.box.HttpBackend();
        backend.expectGet("/zombies/1").toReturn("{\"id\": 1}");
        var zombie = Zombie.$get({ id: 1 });
        var test = "Unchanged";
        zombie.isLoading.subscribe(function () { test = "Changed"; });

        expect(ko.isObservable(zombie.isLoading)).toBe(true);
        expect(ko.isObservable(zombie.isNew)).toBe(true);
        expect(ko.isObservable(zombie.isDirty)).toBe(true);
        expect(ko.isObservable(zombie.isDeleted)).toBe(true);

        expect(zombie.isLoading()).toBe(true);
        expect(zombie.isNew()).toBe(false);
        expect(zombie.isDirty()).toBe(false);

        backend.flush();
        expect(zombie.isLoading()).toBe(false);
        expect(test).toBe("Changed");

        test = "Unchanged";
        zombie.isDirty.subscribe(function () { test = "Changed"; });
        zombie.id(19);
        expect(zombie.id()).toBe(19);
        expect(zombie.isDirty()).toBe(true);
        expect(test).toBe("Changed");

        backend.expectDelete("/zombies/19").toReturn("null");
        var delTest = "Unchanged";
        zombie.isDeleted.subscribe(function () { delTest = "Changed"; });
        expect(zombie.isDeleted()).toBe(false);
        zombie.$delete();
        backend.flush();
        expect(zombie.isDeleted()).toBe(true);
        expect(delTest).toBe("Changed");
    });
});

describe("Collections", function () {
    var Class = genius.Resource.extend({
        id: genius.types.number({nullable: true, defaultTo: null}),
        name: genius.types.string({ defaultTo: "Cameron" }),
        uniqKey: "id"
    });
    it("should be observable arrays", function () {
        var Toy = genius.Resource.extend({
            name: genius.types.string()
        });
        var Zombie = genius.Resource.extend({
            id: genius.types.number(),
            toys: genius.types.collection(genius.types(Toy)),
            url: "/zombies/:id"
        });
        var backend = genius.box.HttpBackend();
        backend.expectGet("/zombies/20").toReturn("{\"id\":20, \"toys\":[{\"name\":\"Hammer\"},{\"name\":\"Mincer\"},{\"name\":\"Cleaver\"}]}");

        var zombie = Zombie.$get({ id: 20 })
        var test = 0;
        expect(ko.isObservable(zombie.toys)).toBe(true);
        expect(zombie.toys().length).toBe(0);
        zombie.toys.subscribe(function (val) { test = val.length; });
        backend.flush();

        var toys = zombie.toys();
        expect(toys.length).toBe(3);
        expect(test).toBe(3);
        expect(toys[0]).toEqual(jasmine.any(Toy));
        expect(toys[1]).toEqual(jasmine.any(Toy));
        expect(toys[2]).toEqual(jasmine.any(Toy));
    });
    it("should initialize typed arrays to observable arrays", function () {
        var Brain = genius.Resource.extend({
            weight: genius.types.number(),
            color: genius.types.string(),
            formerOwner: genius.types.string()
        });
        var Zombie = genius.Resource.extend({
            brains: genius.types.collection(genius.types(Brain))
        });
        var Collection = genius.Collection.extend({ type: genius.types(Brain) });
        var collection = new Collection();
        collection.concat([new Brain({
            weight: 10,
            color: "gray",
            formerOwner: "Jimmy"
        })]);
        var zombo = new Zombie({
            brains: collection
        });
        var brains = zombo.brains(), brain = brains[0];
        expect(ko.isObservable(zombo.brains)).toBe(true);
        expect(genius.utils.isObservableArray(zombo.brains)).toBe(true);
        expect(brain).toEqual(jasmine.any(Brain));
        expect(brain.weight()).toBe(10);
        expect(brain.color()).toBe("gray");
        expect(brain.formerOwner()).toBe("Jimmy");
    });
    it("should splice out deleted items on deletion", function () {
        var Collection = genius.Collection.extend({ type: genius.types(Class) });
        var myClass = new Class({ id: 1, name: "Jammer" });
        var collection = new Collection();
        collection.push(myClass);
        expect(collection().length).toBe(1);
        expect(collection()[0]).toBe(myClass);
        myClass.$delete();
        expect(collection().length).toBe(0);
        expect(genius.utils.contains(collection, myClass)).toBe(false);
    });
    it("should allow direct instantiation", function () {
        var collection = new genius.Collection({ type: genius.types(Class) });
        collection.concat([new Class(), new Class({ name: "Sara" }), new Class({ name: "Jimmy" })]);
        expect(collection()[0] instanceof Class).toBe(true);
        expect(collection()[0].name()).toBe("Cameron");
        expect(collection()[1].name()).toBe("Sara");
        expect(collection()[2].name()).toBe("Jimmy");
    });

    it("should allow uniqueness configuration", function () {
        var collection = new genius.Collection({ type: genius.types(Class), unique: true });
        collection.concat([new Class({ id: 1, name: "Jimbo" }), new Class({ id: 2, name: "Sally" })]);
        expect(collection().length).toBe(2);
        collection.push(new Class({ id: 1, name: "Bobo" }));
        expect(collection().length).toBe(2);
        expect(collection()[0].name()).toBe("Bobo");
    });
    describe(".addNew()", function () {
        it("should push a new Resource onto itself", function () {
            var Class = genius.Resource.extend({});
            var Collection = genius.Collection.extend({ type: genius.types(Class) });
            var collection = new Collection();
            expect(collection().length).toBe(0);
            collection.addNew();
            expect(collection().length).toBe(1);
            expect(collection()[0]).toEqual(jasmine.any(Class));
        });
    });

});

describe("Resource requests", function () {
    it("should parse queries into resources", function () {
        Zombie = genius.Resource.extend({
            url: "/api/zombies/:id",
            uniqKey: "id",
            name: genius.types.string(),
            id: genius.types.number({ nullable: true, defaultTo: null }),
            rand: genius.types.number(),
            parseJs: function (response) {
                return genius.config.types.custom.parseJs().call(this, response.zombie);
            }
        });
        var backend = genius.box.HttpBackend();
        backend.expectGet("/api/zombies?q=munch").toReturn("[{\"name\": \"Muncher\", \"id\": 1, \"rand\": 1091},{\"name\":\"Munchkin\", \"id\": 2, \"rand\": 5687}]");
        var zombies = Zombie.$query({ q: "munch" });
        expect(genius.utils.isObservableArray(zombies)).toBe(true);

        expect(zombies.type().constr()).toBe(Zombie);
        expect(zombies.isLoading()).toBe(true);
        expect(zombies().length).toBe(0);
        backend.flush();
        for (var i = 0; i < zombies().length; i++) {
            expect(zombies()[i].isNew()).toBe(false);
            expect(zombies()[i].isDirty()).toBe(false);
        }
        expect(zombies().length).toBe(2);
        for (var i = 0; i < zombies().length; i++) {
            expect(zombies()[i]).toEqual(jasmine.any(Zombie));
        }
        expect(zombies.isLoading()).toBe(false);
        expect(zombies()[0].name()).toBe("Muncher");
        expect(zombies()[1].name()).toBe("Munchkin");
    });

});

describe("The fromJson method", function () {
    it("should accept plain old JS Objects", function () {
        var Zombie = genius.Resource.extend({
            id: genius.types.number(),
            name: genius.types.string(),
            date: genius.types.date()
        });
        var zombie = Zombie.fromJs({
            id: 1,
            name: "Zombo",
            date: "2014-01-14T21:39:26.081Z"
        });
        expect(zombie.id()).toBe(1);
        expect(zombie.name()).toBe("Zombo");
        var date = zombie.date();
        expect(date.getFullYear()).toBe(2014);
        expect(date.getMonth()).toBe(0);

        var Collection = genius.Collection.extend({ type: genius.types(Zombie) });
        var collection = Collection.fromJs([
            {
                id: 2,
                name: "Sarah",
                date: "1914-01-14T21:44:18.627Z"
            },
            {
                id: 3,
                name: "Jessica",
                date: "1994-01-14T21:44:18.627Z"
            },
            {
                id: 4,
                name: "Zach",
                date: "1984-01-14T21:44:18.627Z"
            }
        ]);
        expect(collection().length).toBe(3);
        expect(collection()[0]).toEqual(jasmine.any(Zombie));
        expect(collection()[1]).toEqual(jasmine.any(Zombie));
        expect(collection()[2]).toEqual(jasmine.any(Zombie));
        expect(collection()[0].id()).toBe(2);
        expect(collection()[0].date()).toEqual(jasmine.any(Date));
        var date = collection()[0].date();
        expect(date.getFullYear()).toBe(1914);
        expect(date.getMonth()).toBe(0);
        expect(date.getDate()).toBe(14);
        expect(collection()[0].name()).toBe("Sarah");
        expect(collection()[1].name()).toBe("Jessica");
        expect(collection()[2].name()).toBe("Zach");
    });
});











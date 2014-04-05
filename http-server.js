var connect = require('connect');
var port = process.argv.length > 2 ? process.argv[2] : 8080;

function Toy(params) {
    this.name = params.name || "";
    this.verb = params.verb || "";
    this.weight = params.weight || 0;
};

function Zombie(params) {
    this.name = params.name || "";
    this.age = params.age || 0;
    this.brains = params.brains ? params.brains.map(function (val) {
        return new Brain(val);
    }) : [];
    this.favoriteToy = params.favoriteToy ? new Toy(params.favoriteToy) : null;
    this.birthday = params.birthday || JSON.stringify(new Date());
};

var zombies = [{
        name: "Zombo",
        age: 21,
        birthday: "1992-04-17T06:00:00.000Z",
        id: 1,
        brains: [{
            weight: 10,
            texture: "squooshy",
            formerOwner: "Jimmy"
        }, {
            weight: 12,
            texture: "firm with a nice crunch",
            formerOwner: "Sandra"
        }],
        favoriteToy: {
            name: "hacksaw",
            verb: "hack",
            weight: 15
        }
    }, {
        name: "Muncher",
        age: 19,
        birthday: "1994-04-17T06:00:00.000Z",
        id: 2,
        favoriteToy: {
            name: "ax",
            verb: "chopp",
            weight: 10
        }
    }, {
        name: "Munchkin",
        age: 20,
        birthday: "1993-04-17T06:00:00.000Z",
        id: 3,
        favoriteToy: {
            name: "hammer",
            verb: "crush",
            weight: 5
        }
    }];

function find(id) {
    return zombies.filter(function (val) { return val.id == id; })[0];
};

var controller = {
    getZombies: function (params) {
        var filtered = zombies;
        for (var x in params) {
            filtered = filtered.filter(function (val) {
                return val[x] ? val[x].toString().toLowerCase().search(params[x].toString().toLowerCase()) !== -1 : false;
            });
        }
        return filtered;
    },
    getZombie: function (id) {
        return find(id);
    },
    postZombies: function (zombie) {
        var lastId = zombies[zombies.length - 1].id;
        zombie = new Zombie(zombie);
        zombie.id = ++lastId;
        zombies.push(zombie);
        return zombie;
    },
    putZombie: function (id, zombie) {
        var oldZombie = find(id);
        if (oldZombie) {
            for (var x in zombie) {
                if (oldZombie[x])
                    oldZombie[x] = zombie[x];
            }
            return oldZombie;
        }
    },
    deleteZombie: function (id) {
        zombies.splice(zombies.indexOf(find(id)), 1);
        return null;
    }
};

connect()
    .use(connect.query())
    .use(connect.bodyParser())
    .use(connect.methodOverride())
    .use(function (req, resp, next) {
        var url = req.url.split(/\/|\?/g);
        var index = req.url.search(/\?/);
        if (index !== -1)
            url = url.slice(0, url.length - 1);
        var data;

        if (url[1] == "zombies") {
            switch (req.method) {
                case "GET":
                    switch (url.length) {
                        case 2:
                            data = controller.getZombies(req.query);
                            break;
                        case 3:
                            data = controller.getZombie(url[2]);
                            break;
                        default:
                            next();
                            return;
                    }
                    break;
                case "POST":
                    data = controller.postZombies(req.body);
                    break;
                case "PUT":
                    if (url[1] == "zombies" && url.length > 2) {
                        var body = req.body;
                        data = controller.putZombie(parseInt(url[2]), body);
                    }
                    break;
                case "DELETE":
                    if (url.length > 1) {
                        data = controller.deleteZombie(url[2]);
                    }
                    break;
                default:
                    next();
                    return;
            }
            var stringified = JSON.stringify(data);
            if (typeof data !== "undefined")
                resp.write(stringified);
            else
                resp.write("no data");
            resp.end();
            return;
        }
        next();
    })
    .use(connect.static(__dirname))
    .listen(port);
console.log("Server running on port " + port);
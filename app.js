const mysql = require("mysql2");
const express = require("express");

const app = express();
const urlencodedParser = express.urlencoded({ extended: false });

const pool = mysql.createPool({
    connectionLimit: 5,
    host: "localhost",
    user: "root",
    database: "transportmonitoring",
    password: "1234"
});

app.set("view engine", "hbs");

app.get("/", function (req, res) {
    const number = req.params.number;
    pool.query("select number from route", function (err, data) {
        if (err) console.log(err);
        res.render("index.hbs", {
            transports: data,
        });
    });
});
/*
app.get("/route/:number", function (req, res) {
    const number = req.params.number;
    let d = [];
    let rd = [];
    pool.query("select r.number as number, name from stop " +
        "inner join route r on stop.route_id = r.id " +
        "where r.number = ?", [number], function (err, numdata) {
            if (err) console.log(err);
            for (var i = 0; i < numdata.length; i++) {
                console.log(numdata[i].name)
                let n = numdata[i].name;
                pool.query("select r.number as number, name from stop " +
                    "inner join route r on stop.route_id = r.id " +
                    "inner join timetable t on stop.id = t.stop_id " +
                    "where name = ? " +
                    "limit 1", [n], function (err, rdata) {
                        if (err) req.next(err);
                        pool.query("select time_format(t.time, '%H:%i') as time from stop " +
                            "inner join timetable t on stop.id = t.stop_id " +
                            "where name =  ?", [n], function (err, data) {
                                console.log("2 " + n);

                                if (err) req.next(err);
                                d[i] = data;
                                rd[i] = rdata;
                            });
                    });
            }
            res.render("route.hbs", {
                times: d,
                routes: rd,
            });
            console.log(d.count);
            console.log(rd.count);
        });
});
*/
app.get("/route/:number", function (req, res) {
    const number = req.params.number;
    pool.query("select r.number as number, name from stop " +
        "inner join route r on stop.route_id = r.id " +
        "where number = ? " +
        "limit 1", [number], function (err, rdata) {
            pool.query("select r.number, name, group_concat(time_format(t.time, '%H:%i') separator ' ') as time from stop " +
                "inner join route r on stop.route_id = r.id " +
                "inner join timetable t on stop.id = t.stop_id " +
                "where r.number = ? " +
                "group by name " +
                "order by time", [number], function (err, data) {
                    if (err) console.log(err);
                    res.render("route.hbs", {
                        stops: data,
                        route: rdata,
                    });
                });
        });
});

app.get("/auth", function (req, res) {
    res.render("auth.hbs");
});

app.post("/auth", urlencodedParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);
    const login = req.body.login;
    const pass = req.body.pass;
    pool.query("select COUNT(*) as count from admin where name=? && password=?", [login, pass], function (err, data) {
        if (err) { return console.log(err); }
        const routes = data;
        for (let i = 0; i < routes.length; i++) {
            console.log(routes[i].count);
            if (routes[i].count > 0) { return res.redirect("/admin"); }
        }
        res.redirect("/auth");
    });
});

app.get("/admin", function (req, res) {
    pool.query("select t.id as id, r.number as number, name, time_format(time, '%H:%i') as time from timetable t " +
        "inner join stop s on t.stop_id = s.id " +
        "inner join route r on s.route_id = r.id " +
        "order by s.id, time", function (err, data) {
            if (err) return console.log(err);
            res.render("admin.hbs", {
                routes: data
            });
        });
})

app.get("/create", function (req, res) {
    res.render("create.hbs");

});
// получаем отправленные данные и добавляем их в БД
app.post("/create", urlencodedParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);
    const id = req.body.id;
 //   const route_id = req.body.list1.selectedValue;
    const admin = 1;
    const time = req.body.time;
    console.log(time);
    const stop = req.body.name;
    const num = req.body.number;
    pool.query("select r.id as id from stop " +
        "inner join route r on stop.route_id = r.id " +
        "where name = ? && r.number = ?", [stop, num], function (err, result) {
            if (err) {
                res.redirect("/create");
                return console.log(err);
            }
    /*        const route_id = result[0].id;
            console.log(route_id);
            pool.query("insert into stop (route_id, name) values (?, ?)", [route_id, stop], function (err, data) {
                if (err) {
                    res.redirect("/create");
                    return console.log(err);
                }*/
                pool.query("insert into timetable (stop_id, time, admin_id) values (?, ?, ?)", [result[0].id, time, admin], function (err, data) {
                    if (err) {
                        res.redirect("/create");
                        return console.log(err);
                    }
                    res.redirect("/admin");
                });
            });
      //  });
});
// получем id редактируемого товара, получаем его из бд и отправлям с формой редактирования
app.get("/edit/:id", function (req, res) {
    const id = req.params.id;
    pool.query("select t.id as id, r.number as number, name, time_format(time, '%H:%i') as time from timetable t " +
        "inner join stop s on t.stop_id = s.id " +
        "inner join route r on s.route_id = r.id " +
        "where t.id=?", [id], function (err, data) {
            if (err) return console.log(err);
            res.render("edit.hbs", {
                timetable: data[0]
            });
        });
});

// получаем отредактированные данные и отправляем их в БД
app.post("/edit", urlencodedParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);
    console.log(req.body.id);
    const id = req.body.id;
    const time = req.body.time;
    console.log("время " + time);
    const admin = 1;
    const number = req.body.number;
    const name = req.body.name;
    pool.query("select stop.id as id from stop " +
        "inner join route r on stop.route_id = r.id " +
        "where name = ? && r.number = ?", [name, number], function (err, result) {
            if (err) {
                res.redirect("/edit/:id");
                return console.log(err);
            }
            const stop_id = result[0].id;
            console.log(stop_id);
            console.log(id + " " + time + " " + number + " " + stop_id);
            pool.query("update timetable set stop_id = ?, time = ?, admin_id = ? where id = ?", [stop_id, time, admin, id], function (err, data) {
                if (err) return console.log(err);
                res.redirect("/admin");
            });
        });
});

// получаем id удаляемого товара и удаляем его из бд
app.post("/delete/:id", function (req, res) {

    const id = req.params.id;
    pool.query("delete from timetable where id = ?", [id], function (err, data) {
        if (err) return console.log(err);
        res.redirect("/admin");
    });
});

app.get("/admin_route", function (req, res) {
    pool.query("select id, number, city, time_format(travel_time, '%H:%i') as travel_time from route " +
        "order by number", function (err, data) {
            if (err) return console.log(err);
            res.render("admin_route.hbs", {
                route: data
            });
        });
})

app.get("/create_route", function (req, res) {
    res.render("create_route.hbs");

});
// получаем отправленные данные и добавляем их в БД
app.post("/create_route", urlencodedParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);
    const id = req.body.id;
    const number = req.body.number;
    const city = req.body.city;
    const time = req.body.travel_time;
    pool.query("insert into route (number, city, travel_time) values(?, ?, ?)", [number, city, time], function (err, result) {
        if (err) {
            res.redirect("/create_route");
            return console.log(err);
        }
        res.redirect("/admin_route");
    });
});
// получем id редактируемого товара, получаем его из бд и отправлям с формой редактирования
app.get("/edit_route/:id", function (req, res) {
    const id = req.params.id;
    pool.query("select id, number, city, travel_time from route where id = ?", [id], function (err, data) {
            if (err) {
                return console.log(err);
            }
            res.render("edit_route.hbs", {
                timetable: data[0]
            });
        });
});

// получаем отредактированные данные и отправляем их в БД
app.post("/edit_route", urlencodedParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);
    console.log(req.body.id);
    const id = req.body.id;
    const number = req.body.number;
    const city = req.body.city;
    const time = req.body.travel_time;
    console.log(time);
    pool.query("update route set number = ?, city = ?, travel_time = ? where id = ?", [number, city, time, id], function (err, data) {
        if (err) { 
            res.redirect("/edit_route/:id")
            return console.log(err);
        }
        res.redirect("/admin_route");
    });
});

// получаем id удаляемого товара и удаляем его из бд
app.post("/delete_route/:id", function (req, res) {

    const id = req.params.id;
    pool.query("delete from route where id = ?", [id], function (err, data) {
        if (err) return console.log(err);
        res.redirect("/admin_route");
    });
});

app.listen(3000, function () {
    console.log("Сервер ожидает подключения...");
});
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt, { compareSync } from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth20";
import session from "express-session";
import env from "dotenv";
var items = [{ name: "Oranges", quantity: "4", price: "45.9" }, { name: "Apples", quantity: "6", price: "47.9" }];
console.log(items);
var inventory = ["Oranges", "Apples", "Kiwi", "Mango"];
var itemsDatabase = [];
const app = express();
const port = 3000;
const saltRounds = 10;
let transactioDone = "NULL TRANSACTION";
env.config();
let currentUserId;
let currentUserName = "";
let transactionStatus = true;
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
    })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());
console.log(new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString());

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect();

app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

app.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })
);

app.get(
    "/auth/google/pos",
    passport.authenticate("google", {
        successRedirect: "/merchant",
        failureRedirect: "/login",
    })
);


app.get("/merchant", async (req, res) => {
    if (req.isAuthenticated()) {
        currentUserId = req.user.id;
        currentUserName = req.user.username;
        currentUserId
        let price = 0;
        for (let i = 0; i < items.length; i++) {
            price += (parseFloat(items[i].price) * parseInt(items[i].quantity));
        }
        try {
            const result = await db.query("SELECT itemname , price FROM inventory WHERE merchantid = $1", [currentUserId]);
            const out = result.rows;
            itemsDatabase = out;
            inventory = [];
            out.forEach((item) => { inventory.push(item.itemname) });
            console.log(items);
            res.render("merchantHome.ejs", { transaction: transactionStatus, addedItems: items, inventory: inventory, totalAmount: price ,status : transactioDone});
        } catch (error) {
            console.error("Error executing query", error);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.redirect("/login");
    }
});

app.post("/transact", (req, res) => {
    console.log("user : " + req.user);
    const item = req.body.items;
    const quantity = req.body.quantity;
    console.log("Item: " + item + ", Quantity: " + quantity);
    console.log("Items Database: ", itemsDatabase);
    let price = -1.0;
    for (let i = 0; i < itemsDatabase.length; i++) {
        if (itemsDatabase[i].itemname === item) {
            price = parseFloat(itemsDatabase[i].price);
            console.log("Price: " + price);
            break;
        }
    }
    let idx = -1;
    let i = 0;
    while (i < items.length) {
        if (items[i].name === item) {
            idx = i;
            break;
        }
        i++;
    }
    if (price !== -1.0) {
        if (idx !== -1) {
            items[idx].quantity = String((parseInt(items[idx].quantity) + parseInt(quantity)));
        }
        else {
            const obj = {
                name: item,
                quantity: String(quantity),
                price: String(price),
            };
            items.push(obj);
        }
    } else {
        console.error("Item not found or price invalid.");
    }
    res.redirect("/merchant");
});

app.get("/clear", (req, res) => {
    items = [];
    res.redirect("/merchant");
});

app.post("/submitTransaction", async (req, res) => {
    let price = 0;
    try {
        for (let i = 0; i < items.length; i++) {
            price += (parseFloat(items[i].price) * parseInt(items[i].quantity));
        }
        console.log(currentUserId);
        const json = JSON.stringify(items);
        const date = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
        const result = await db.query("INSERT INTO sales (merchantid , date , customername, amount , items , payment) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [currentUserId, date, req.body.name, price, json, req.body.nature]);
        console.log(result.rows[0]);
        items = [];
        transactioDone = "SUCCESS";
    }
    catch(err){
        console.log(err);
    }

    res.redirect("/merchant");
});

app.post("/transactExpense", async (req, res) => {
    if (req.isAuthenticated()) {
        const currentUserId = req.user.id;
        const merchantName = req.body.name;
        const amount = parseFloat(req.body.amount);
        const reason = req.body.reason;
        const nature = req.body.nature;
        const date = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();

        if (isNaN(amount)) {
            console.error("Invalid amount:", req.body.amount);
            transactioDone = "FAILED: Invalid amount";
            res.redirect("/merchant");
            return;
        }

        try {
            const result = await db.query(
                "INSERT INTO expenditure (merchantid, date, vendorname, amount, comment, payment) VALUES ($1, $2, $3, $4, $5, $6)",
                [currentUserId, date, merchantName, amount, reason, nature]
            );
            transactioDone = "SUCCESS";
        } catch (error) {
            console.error("Error executing query", error);
            transactioDone = "FAILED: Error executing query";
        }
    } else {
        console.error("User not authenticated");
        transactioDone = "FAILED: User not authenticated";
    }

    res.redirect("/merchant");
});

app.post("/login", (req, res, next) => {
    items = [];
    console.log("Login post request");
    console.log("Request body:", req.body);
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            console.error("Error during authentication:", err);
            return next(err);
        }
        if (!user) {
            console.log("Authentication failed");
            return res.redirect("/login");
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error("Error logging in:", err);
                return next(err);
            }
            console.log("Authentication successful, redirecting to /merchant");
            return res.redirect("/merchant");
        });
    })(req, res, next);
});

app.post("/register", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    try {
        const checkResult = await db.query("SELECT * FROM userlists WHERE email = $1", [email]);
        if (checkResult.rows.length > 0) {
            console.log("User already exists");
            res.redirect("/login");
        } else {
            bcrypt.hash(password, saltRounds, async (err, hash) => {
                if (err) {
                    console.error("Error hashing password:", err);
                } else {
                    const result = await db.query(
                        "INSERT INTO userlists (username, email, password) VALUES ($1, $2, $3) RETURNING *",
                        [name, email, hash]
                    );
                    const user = result.rows[0];
                    req.logIn(user, (err) => {
                        if (err) {
                            console.error("Error logging in after registration:", err);
                            res.redirect("/login");
                        } else {
                            console.log("Registration successful, redirecting to /merchant");
                            res.redirect("/merchant");
                        }
                    });
                }
            });
        }
    } catch (err) {
        console.error(err);
    }
});

app.get("/transaction", (req, res) => {
    transactionStatus = true;
    res.redirect("/merchant");
});

app.get("/expenses", (req, res) => {
    transactionStatus = false;
    res.redirect("/merchant");
});

app.get("/sale", (req, res) => {

});

passport.use(
    new Strategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, cb) => {
        try {
            const result = await db.query("SELECT * FROM userlists WHERE email = $1", [email]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                console.log("User found:", user);
                const storedHashedPassword = user.password;
                bcrypt.compare(password, storedHashedPassword, (err, valid) => {
                    if (err) {
                        console.error("Error comparing passwords:", err);
                        return cb(err);
                    }
                    if (valid) {
                        console.log("User authenticated");
                        return cb(null, user);
                    } else {
                        console.log("Invalid password");
                        return cb(null, false);
                    }
                });
            } else {
                console.log("User not found");
                return cb(null, false);
            }
        } catch (err) {
            console.error("Error during verification:", err);
            return cb(err);
        }
    })
);

passport.use(
    "google",
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:3000/auth/google/pos",
            userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
        },
        async (accessToken, refreshToken, profile, cb) => {
            try {
                console.log(profile);
                const result = await db.query("SELECT * FROM userlists WHERE email = $1", [
                    profile.email,
                ]);
                if (result.rows.length === 0) {
                    const newUser = await db.query(
                        "INSERT INTO userlists (username , email, password) VALUES ($1, $2, $3)",
                        [profile.name, profile.email, "google"]
                    );
                    return cb(null, newUser.rows[0]);
                } else {
                    return cb(null, result.rows[0]);
                }
            } catch (err) {
                return cb(err);
            }
        }
    )
);

passport.serializeUser((user, cb) => {
    cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
    try {
        const result = await db.query("SELECT * FROM userlists WHERE id = $1", [id]);
        if (result.rows.length > 0) {
            cb(null, result.rows[0]);
        } else {
            cb(new Error("User not found"));
        }
    } catch (err) {
        cb(err);
    }
});

app.get("/hello", (req, res) => {
    res.render("merchantHome.ejs");
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

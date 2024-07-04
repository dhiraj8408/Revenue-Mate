import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt, { compareSync } from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth20";
import session from "express-session";
import env from "dotenv";
const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

var items = [{ name: "Oranges", quantity: "4", price: "45.9" }, { name: "Apples", quantity: "6", price: "47.9" }];
var inventory = ["Oranges", "Apples", "Kiwi", "Mango"];
var itemsDatabase = [];
let transactionDone = "NULL TRANSACTION";
let currentUserId;
let currentUserName = "";
let transactionStatus = true;
let transaction = [];
let invoiceNo = 1;

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
        let price = 0;
        for (let i = 0; i < items.length; i++) {
            price += (parseFloat(items[i].price) * parseInt(items[i].quantity));
        }
        try {
            const result = await db.query("SELECT itemname, price FROM inventory WHERE merchantid = $1", [currentUserId]);
            const out = result.rows;
            itemsDatabase = out;
            inventory = [];
            out.forEach((item) => { inventory.push(item.itemname); });
            console.log(items);

            transaction = [];

            const salesResult = await db.query("SELECT date, amount, payment FROM sales WHERE merchantid = $1", [currentUserId]);
            const expenditureResult = await db.query("SELECT date, amount, payment FROM expenditure WHERE merchantid = $1", [currentUserId]);

            console.log(salesResult.rows);
            console.log(expenditureResult.rows);

            for (let i = 0; i < salesResult.rows.length; i++) {
                const obj = {
                    date: salesResult.rows[i].date,
                    type: "credit",
                    amount: salesResult.rows[i].amount,
                    mode: salesResult.rows[i].payment,
                }
                transaction.push(obj);
            }
            for (let i = 0; i < expenditureResult.rows.length; i++) {
                const obj = {
                    date: expenditureResult.rows[i].date,
                    type: "debit",
                    amount: expenditureResult.rows[i].amount,
                    mode: expenditureResult.rows[i].payment,
                }
                transaction.push(obj);
            }

            res.render("merchantHome.ejs", { transaction: transactionStatus, addedItems: items, inventory: inventory, totalAmount: price, status: transactionDone, username: currentUserName });
        } catch (error) {
            console.error("Error executing query", error);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.redirect("/login");
    }
});


app.post("/transact", (req, res) => {
    if (req.isAuthenticated()) {
        const item = req.body.items;
        const quantity = req.body.quantity;
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
    }
    res.redirect("/merchant");
});

app.get("/clear", (req, res) => {
    items = [];
    transaction = [];
    res.redirect("/merchant");
});

app.post("/submitTransaction", async (req, res) => {
    if (req.isAuthenticated()) {
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
            transactionDone = "SUCCESS";
            {
                invoiceItems.from = currentUserName;
                invoiceItems.to = req.body.name;
                invoiceItems.date = date;
                invoiceItems.number = "INV - " + invoiceNo;
                ++(invoiceNo);
                for (let i = 0; i < items.length; i++) {
                    const obj = {
                        name: items[i].name,
                        quantity: items[i].quantity,
                        unit_cost: items[i].price,
                    }
                    invoiceItems.items.push(obj);
                }
            }
            items = [];
        }
        catch (err) {
            console.log(err);
        }
    }
    else {
        console.log("No Authentciation : ");
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
            transactionDone = "FAILED: Invalid amount";
            res.redirect("/merchant");
            return;
        }

        try {
            const result = await db.query(
                "INSERT INTO expenditure (merchantid, date, vendorname, amount, comment, payment) VALUES ($1, $2, $3, $4, $5, $6)",
                [currentUserId, date, merchantName, amount, reason, nature]
            );
            transactionDone = "SUCCESS";
        } catch (error) {
            console.error("Error executing query", error);
            transactionDone = "FAILED: Error executing query";
        }
    } else {
        console.error("User not authenticated");
        transactionDone = "FAILED: User not authenticated";
    }
    res.redirect("/merchant");
});

app.get("/Profile", (req, res) => {
    if (req.isAuthenticated()) {
        let creditAmount = 0;
        let debitAmount = 0;
        for (let i = 0; i < transaction.length; i++) {
            if (transaction[i].type === "credit") creditAmount += parseFloat(transaction[i].amount);
            else debitAmount += parseFloat(transaction[i].amount);
        }
        res.render("profile.ejs", { Transaction: transaction, creditAmount: creditAmount, debitAmount: debitAmount, netSales: creditAmount - debitAmount, username: currentUserName });
    }
    else {
        res.redirect("/login");
    }
});

app.post("/gettransactions", async (req, res) => {
    console.log(req);
    if (req.isAuthenticated()) {
        const type = req.body.type;
        const nature = req.body.nature;
        console.log(type);
        console.log(nature);
        try {
            transaction = [];
            const salesResult = await db.query("SELECT date, amount, payment FROM sales WHERE merchantid = $1", [currentUserId]);
            const expenditureResult = await db.query("SELECT date, amount, payment FROM expenditure WHERE merchantid = $1", [currentUserId]);
            if ((type === 'NONE') || (type === 'sales')) {
                console.log("type : None || sales");
                for (let i = 0; i < salesResult.rows.length; i++) {
                    if ((nature === 'NONE') || (nature === salesResult.rows[i].payment)) {
                        const obj = {
                            date: salesResult.rows[i].date,
                            type: "credit",
                            amount: salesResult.rows[i].amount,
                            mode: salesResult.rows[i].payment,
                        }
                        transaction.push(obj);
                    }
                }
            }
            if (type === 'NONE' || type === 'expenditure') {
                for (let i = 0; i < expenditureResult.rows.length; i++) {
                    if (nature === 'NONE' || nature === expenditureResult.rows[i].payment) {
                        const obj = {
                            date: expenditureResult.rows[i].date,
                            type: "debit",
                            amount: expenditureResult.rows[i].amount,
                            mode: expenditureResult.rows[i].payment,
                        }
                        transaction.push(obj);
                    }
                }
            }
        }
        catch (err) {
            console.log(err);
        }
    }
    res.redirect("/Profile");
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

app.get("/inventory", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const result = await db.query("SELECT itemname FROM inventory WHERE merchantid = $1", [currentUserId]);
            const inventoryList = result.rows;
            console.log(inventoryList);
            res.render("inventory.ejs", { inventory: inventoryList, username: currentUserName });
        }
        catch (err) {
            console.log(err);
        }
    }
    else {
        res.redirect("/login");
    }
});

app.post("/deleteInventory", async (req, res) => {
    const itemsToDelete = req.body.selectedItems;
    console.log('Items to delete:', itemsToDelete); // Debugging line to check the request body

    if (!itemsToDelete) {
        return res.status(400).send("No items selected");
    }

    try {
        if (Array.isArray(itemsToDelete)) {
            for (let i = 0; i < itemsToDelete.length; i++) {
                await db.query("DELETE FROM inventory WHERE merchantid = $1 AND itemname = $2", [currentUserId, itemsToDelete[i]]);
            }
        }
        else {
            await db.query("DELETE FROM inventory WHERE merchantid = $1 AND itemname = $2", [currentUserId, itemsToDelete]);
        }
        res.redirect("/inventory");
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/addinventory", async (req, res) => {
    const name = req.body.itemname;
    const price = req.body.price;
    try {
        const result = await db.query("INSERT INTO inventory (merchantid,itemname,price) VALUES($1, $2,$3)", [currentUserId, name, price]);
        res.redirect("/inventory");
    }
    catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }

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

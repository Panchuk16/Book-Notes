import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
import axios from "axios";

const app = express();
const port = 3000;
env.config();

const db = new pg.Client({
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
});

db.connect();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

let notes = [];
let books = [];

async function getNotes() {
    notes = [];
    const result = await db.query("SELECT * FROM note");
    result.rows.forEach(note => {
        notes.push(result.rows);
    });
    return notes;
};

async function getBooks() {
    books = [];
    const result = await db.query("SELECT * FROM book");
    books = result.rows;
    return books;
}

app.get("/", async (req, res) => {
    const books = await getBooks();
    console.log(books);
    res.render("index.ejs", {
        books: books,
    });
});

app.get("/new", (req, res) => {
    res.render("new.ejs");
});

app.post("/new", async (req, res) => {
    const title = req.body.title;
    const author = req.body.author;

    const response = await axios.get("https://openlibrary.org/search.json", {
        params: {title: title}
    });
    const result = response.data;
    const isbn = result.docs?.[0]?.isbn?.[0] || result.docs?.[0]?.isbn;
    const olid = result.docs?.[0]?.author_key?.[0] || 'Author key is not available';

    if (title, author) {
    await db.query(
        "INSERT INTO book (title, author, isbn, olid) VALUES ($1, $2, $3, $4)",
        [title, author, isbn, olid]
    );
    res.redirect("/");
    };
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
});
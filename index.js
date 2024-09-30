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

let books = [];
let notes = "";

async function getNotes(id) {
    notes = "";
    const result = await db.query("SELECT note FROM book_notes WHERE book_id = $1",
        [id]);
    if (result.rows.length === 0) {
        notes = "No notes yet"
        return notes;
    } else {
        notes = result.rows[0].note;
        return notes;
    }
};

async function getBooks() {
    books = [];
    const result = await db.query("SELECT * FROM book");
    books = result.rows;
    return books;
}

app.get("/", async (req, res) => {
    const books = await getBooks();
    // console.log(books);
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
    const note = req.body.notes;

    const response = await axios.get("https://openlibrary.org/search.json", {
        params: {title: title}
    });
    const result = response.data;
    const isbn = result.docs?.[0]?.isbn?.[0] || result.docs?.[0]?.isbn;
    const olid = result.docs?.[0]?.author_key?.[0] || 'Author key is not available';

    if (title, author) {
    await db.query(
        "INSERT INTO book (title, author, isbn, olid) VALUES ($1, $2, $3, $4)",
        [title, author, isbn, olid]);

    const result = await db.query("SELECT id FROM book WHERE title = $1", [title]);
    const id = result.rows[0].id;
    await db.query(
        "INSERT INTO book_notes (book_id, note) VALUES ($1, $2)",
        [id, note]);

    res.redirect("/");
    };
});

app.get("/book/:id", async (req, res) => {
    const books = await getBooks();
    const id = req.params.id;

    const book = books.find(b => b.id === parseInt(id));
    if (!book) {
        return res.status(404).send("Book is not found");
    }
    const notes = await getNotes(id);
    res.render("book.ejs", {
        book: book,
        notes: notes,
        id: id,
    });

});

app.get("/edit/:id", async (req, res) => {
    const id = req.params.id;
    const result = await db.query("SELECT note FROM book_notes WHERE book_id = $1",
        [id]);

    console.log(id);
    const notes = result.rows[0]?.note || '';
    console.log(result);
    console.log(notes);
    
    const books = await getBooks();
    const book = books.find(b => b.id === parseInt(id));
    
    if (!book) {
        return res.status(404).send("Book not found");
    }

    res.render("edit.ejs", {
        books: books,
        id: id,
        notes: notes,
        book: book
    });
});

app.post("/edit/:id", async (req, res) => {
    const id = req.params.id; // Get the book ID from the parameters
    const updatedNotes = req.body.notes; // Get the updated notes from the request body

    try {
        // Check if there is an entry in the book_notes table for this book
        const result = await db.query("SELECT * FROM book_notes WHERE book_id = $1", [id]);

        if (result.rows.length > 0) {
            // If the entry exists, update the notes
            await db.query("UPDATE book_notes SET note = $1 WHERE book_id = $2", [updatedNotes, id]);
            res.redirect(`/edit/${id}`);
        } else {
            // If there is no entry, create a new record
            await db.query("INSERT INTO book_notes (book_id, note) VALUES ($1, $2)", [id, updatedNotes]);
            res.redirect(`/edit/${id}`);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating or creating notes");
    }
});


app.get("/about", (req, res) => {
    res.render("about.ejs");
});

app.get("/delete/:id", async (req, res) => {
    const id = req.params.id;
    try {
    await db.query("DELETE FROM book WHERE id = $1", [id]);
    await db.query("DELETE FROM book_notes WHERE book_id = $1", [id]);
    console.log("Book and its notes have been deleted");
    res.redirect("/");
    } catch (err) {
        console.log(err);
    };
});



app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
});
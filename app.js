//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
// require mongoose
const mongoose = require("mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));

// create DB & connect to it
mongoose.connect("mongodb://localhost:27017/todolistDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// create schema for todolistDB
// just one field name of type string
const itemsSchema = new mongoose.Schema({
    name: String
});

// create mongoose model based on the schema
const Item = new mongoose.model("Item", itemsSchema);

// create default list items
const item1 = new Item({
    name: "1 Hour Portuguese Learning"
});

const item2 = new Item({
    name: "4 Hours Js Learning"
});

const item3 = new Item({
    name: "4 Hours Java Learning"
});

// create schema for custom list
const customListSchema = new mongoose.Schema({
    // list name
    name: String,
    // an array of items of itemsSchema
    items: [itemsSchema]
});

// create custom list model
const List = mongoose.model("List", customListSchema);


// put default items into an array to add all at once to DB
const defaultItems = [item1, item2, item3];

app.get("/", function(req, res) {
    // find all items in DB and render them on page
    Item.find({}, function(err, fountItems) {
        // if foundItems is empty then proceed to add defaults items
        if (fountItems.length === 0) {
            // insert defaultItems into db using insertMany
            // if error occured it displays it
            // if successfull logs a success message
            Item.insertMany(defaultItems, function(err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Successfully added items to DB");
                }
            });
            // redirect to home page to render
            res.redirect("/");
        } else {
            // pass each item to the newListItems
            res.render("list", {
                listTitle: "Today",
                newListItems: fountItems
            });
        }
    });
});

app.post("/delete", function(req, res) {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

    // if default list
    if (listName === "Today") {

        Item.findByIdAndRemove(checkedItemId, function(err) {
            if (err) {
                console.log(err);
            }
        });

        res.redirect("/");
        // if a customer list
    } else {
        // find the list and update a value
        // $pull to delete entry from array
        // $pull params - array & id of entry from array
        // we need to pull
        List.findOneAndUpdate({
            name: listName
        }, {
            $pull: {
                items: {
                    _id: checkedItemId
                }
            }
        }, function(err, foundList) {
            if (!err) {
                res.redirect("/" + listName);
            }
        });
    }



});


app.post("/", function(req, res) {
    // get the new list entry
    const itemName = req.body.newItem;
    // get listname to add entry to relevant list
    const listName = req.body.list;
    // create a new Item to add to DB
    const newItem = new Item({
        name: itemName
    });

    // default page
    if (listName === "Today") {
        // save to DB
        newItem.save();
        // redirect to home page to show new item
        res.redirect("/");
        // custom list page
    } else {
        // find list
        List.findOne({
            name: listName
        }, function(err, foundList) {
            // push item into array
            // console.log(foundList);
            foundList.items.push(newItem);
            // save to DB
            foundList.save();
            // redirect to custom path
            res.redirect("/" + listName);
        });
    }

});

// get custom route
app.get("/:customListName", function(req, res) {
    // save to var and capitalize using lodash for consistency
    const listName = _.capitalize(req.params.customListName);

    // check if list of that name already exist
    if (List.findOne({
            name: listName
        }, function(err, foundList) {

            if (!err) {
                if (!foundList) {
                    // create a new list
                    const list = new List({
                        name: listName,
                        items: defaultItems
                    });
                    // save to DB
                    list.save();
                    // redirect to current page
                    res.redirect("/" + listName);
                } else {
                    // show an existing list
                    res.render("List", {
                        listTitle: foundList.name,
                        newListItems: foundList.items
                    });
                }
            }
        }));

});

app.get("/about", function(req, res) {
    res.render("about");
});

app.listen(3000, function() {
    console.log("Server started on port 3000");
});

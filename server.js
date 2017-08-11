const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');

const { DATABASE_URL, PORT } = require('./config');
const { BlogPost } = require('./models');

const app = express();

app.use(morgan('common'));
app.use(bodyParser.json());

mongoose.Promise = global.Promise;

app.get('/posts', (req, res) => {
	BlogPost
		.find()
		.exec()
		.then(posts => {
			res.json(posts.map(post => post.apiRepr()));
		})
		.catch(err => res.status(500).json({message: 'Internal server error'}));
})

app.get('/posts/:id', (req, res) => {
	BlogPost
		.findById(req.params.id)
		.exec()
		.then(post => res.json(post.apiRepr()))
		.catch(err => res.status(500).json({message: 'Internal server error'}));
});

app.post('/posts', (req, res) => {
	const requiredFields = ['title', 'content', 'author'];
	for (let i = 0; i < requiredFields.length; i++) {
		const field = requiredFields[i];
		if(!(field in req.body)) {
			const message = `Missing \`${field}\` in request body`
			console.error(message);
			return res.status(400).send(message);
		}
	}
	BlogPost
		.create({
			title: req.body.title,
			content: req.body.content,
			author: req.body.author
		})
		.then(blogPost => res.status(201).json(blogPost.apiRepr()))
		.catch(err => res.status(500).json({message: 'Internal server error'}));
});


app.put('/posts/:id', (req, res) => {
	const toUpdate = {};
	const updateableFields = ['title', 'content', 'author'];
	updateableFields.forEach(field => {
		if (field in req.body) {
			toUpdate[field] = req.body[field]
		}
	});
	BlogPost
		.findByIdAndUpdate(req.params.id, {$set: toUpdate})
		.exec()
		.then(updatedPost => res.status(201).json(updatedPost.apiRepr()))
		.catch(err => res.status(500).json({message: 'Internal server error'}));

});

app.delete('/posts/:id', (req, res) => {
	BlogPost
		.findByIdAndRemove(req.params.id)
		.exec()
		.then(() => {
			res.status(204).json({message: 'Deleted as requested'})
		})
		.catch(err => res.status(500).json({message: 'Failed to delete'}));
		});



app.use('*', function(req, res) {
    res.status(404).json({ message: 'Entry Not Found' });
});

let server;

function runServer(databaseUrl = DATABASE_URL, port = PORT) {
    return new Promise((resolve, reject) => {
        mongoose.conect(databaseUrl, err => {
            if (err) {
                return reject(err);
            }
            server = app.listen(port, () => {
                    console.log(`Your app is listening on port ${port}`);
                    resolve();
                })
                .on('error', err => {
                    mongoose.disconnect();
                    reject(err);
                });
        });
    });
}

function closeServer() {
    return mongoose.disconnect().then(() => {
        return new Promise((resolve, reject) => {
            console.log('Closing Server');
            server.close(err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    });
}

if (require.main === module) {
    runServer().catch(err => console.error(err));
};

module.exports = { app, runServer, closeServer };
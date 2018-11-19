const express 	= require('express');
const fs 		= require('fs');
const needle 	= require('needle');
const axios 	= require('axios');
const rax 		= require('retry-axios');
var Client 		= require('node-torrent');
var Transmission = require('transmission');
var pather 		= require('path');
const srt2vtt = require('srt-to-vtt');
var cookieParser = require('cookie-parser')
var rimraf = require('rimraf');

const OpenSubtitles = require('opensubtitles-api');
const OS = new OpenSubtitles({
	useragent: "Hypertube v1",
	username: "hypertube_optimus",
	password: "33cats44dogs",
	ssl: true
});

// the most trashful code you have ever seen in your life...
// dont try it at home
// to test: tt0078788


var cors = require('cors')
var torrentStream = require('torrent-stream');

const API_KEY = 'ec8920bdb431590b48d7b0205e7d6a49';  // API key for themoviedb.org
const OMDB_API_KEY = '651e2d43';

const port = 3200;

const app = express();
app.use(cors());
app.use(cookieParser());

app.use(express.static(pather.join(__dirname, 'public')));
app.use(express.static('public'));
app.use('/public', express.static(pather.join(__dirname, 'public')));

app.use('/videos', express.static('/tmp/videos'));

app.use((req, res, next) => {
	res.set({
		'Access-Control-Allow-Origin':			'http://localhost:3000',
		'Access-Control-Allow-Credentials':		'true',
	});
	next();
});

app.get('/test', async (request, response) => {
	console.log(request.cookies);
	response.send('ok');
});

// ============================== this is check every 10 minutes if we need to clean old(30 days unused) films

setTimeout(async function runCleaner() {
	const {Client}  = require('pg');

	const db = new Client({
	  user: 'Hypertube',
	  host: 'localhost',
	  database: 'Hypertube',
	  password: '12345',
	  port: 5433,
	});

	await db.connect()

	const result_to_delete = await db.query( "SELECT * from popular_films where  NOW() - last_seen > INTERVAL '30 days'");
	var params = [];
	for (var i = result_to_delete.rows.length - 1; i >= 0; i--) {
		console.log('now to delete this film :');
		console.log(result_to_delete.rows[i]['imdb_id']);
		params.push(result_to_delete.rows[i]['imdb_id']);
		if (fs.existsSync('/tmp/videos/' + result_to_delete.rows[i]['imdb_id'])) {
			var temp_imdb_id = result_to_delete.rows[i]['imdb_id'];
			rimraf('/tmp/videos/' + result_to_delete.rows[i]['imdb_id'], function () { 
				console.log('=========\ndeleted folder /tmp/videos/' + temp_imdb_id + '\n=========\n');
			});
			
		}
	}
	if (result_to_delete.rows.length > 0) {
		const result_to_delete2 = await db.query( "DELETE from popular_films where imdb_id = ANY($1) ", [params]);
	} else {
		console.log('nothing to clean');
	}
	await db.end()
	
	setTimeout(runCleaner, 1000 * 60 * 10);
}, 5000);

// ============================== function to validate user

const userAuth = async (req, res, next) => {
	const { cookies } = req;
	if (cookies['x-auth-token']) {
		try {
			const response = await axios({
				method: 'GET',
				url: 'http://localhost:8080/api/auth/udata',
				headers: { 'Cookie': "x-auth-token=" + cookies['x-auth-token'] },
				withCredentials: true
			});
			req.user = response.data.payload;
			next();
		} catch (e) {
			res.json({'success': false, 'error': 'invalid token'});
		}
	} else {
		res.json({'success': false, 'error': 'invalid token'});
	}
}

app.all('*', userAuth);

// ============================== get OUR popular films

app.get('/popular_films', async (request, response) => {
	// console.log(request.user);

	// language: to request from api user settings
	language = request.user.locale || 'en';

	// integer 1 - 1000
	page = request.query.page || 1;

	// desc or asc
	order = request.query.order || 'desc';

	const {Client}  = require('pg');

	const db = new Client({
	  user: 'Hypertube',
	  host: 'localhost',
	  database: 'Hypertube',
	  password: '12345',
	  port: 5433,
	});

	await db.connect()

	const res = await db.query('SELECT * from popular_films order by count ' + order + ' limit 20 offset ' + (page - 1) * 20 + ';');
	await db.end()

	var rows = res['rows'];


	try {
		const promisesArray = rows.map(element => {
			let url = 'https://api.themoviedb.org/3/movie/' + element.imdb_id + '?api_key=' + API_KEY + '&language=' + language;
			return axios(url);
		});

		const detailed_result_const = await axios.all(promisesArray.map(p => p.catch(() => 'NOT_RESOLVED_MOVIE_INFO')));
		var detailed_result = detailed_result_const;

	} catch(err) {
	    console.error('Error:', err);
	}

	final_response = detailed_result.map(element => {return element.data});

	for (var i = final_response.length - 1; i >= 0; i--) {
		final_response[i]['poster_path'] = 'http://image.tmdb.org/t/p/w342' + final_response[i]['poster_path'];
		final_response[i]['popular_films_count'] = rows[i]['count'];
	}

	response.send(final_response);

});


app.get('/films', (req, res, next) => {
	if (req.query.with_genres) {
		req.query.with_genres += "";
	}
	next();
}, async (req, res) => {
	const defaultFilters = {
		search: {
			"include_adult": "false"
		},
		discover: {
			"include_adult": "false",
			"include_video": "false",
			"with_release_type": "1|2|3",
			"vote_count.gte": "5"
		}
	};
	let url = "https://api.themoviedb.org/3";
	let params = {};
	const filters = req.query;

	if (filters.query) {
		url += "/search/movie";
		filters.query = encodeURIComponent(filters.query);
		params = { ...defaultFilters.search, ...filters };
	} else {
		url += "/discover/movie";
		params = { ...defaultFilters.discover, ...filters };
	}

	params.api_key = API_KEY;
	params.language = req.user.locale;
	
	console.log(`Making a request (${url}) with params`, params);

	try {
		const response = await axios.get(url, { params });
		const { data } = response;
		data.results.forEach(movie => {
			if (movie.poster_path) {
				movie.poster_path = 'http://image.tmdb.org/t/p/w342' + movie.poster_path;
			}
		});
		res.json({ 'success': true, 'movies': data });
	} catch (e) {
		console.error(e);
		res.json({ 'success': false, 'error': 'api failed' });
	}
});

app.get('/film_details/:movieId', async (req, res, next) => {
	const { movieId } = req.params;
	const url = `https://api.themoviedb.org/3/movie/${movieId}`;
	const params = {
		api_key: API_KEY,
		language: req.user.locale,
		id: movieId,
		append_to_response: "credits"
	};

	console.log(`Making a request (${url}) with params`, params);

	try {
		const response = await axios.get(url, { params });
		const { imdb_id, poster_path } = response.data;
		response.data.poster_path = 'http://image.tmdb.org/t/p/w342' + poster_path;
		req.movie = { imdb_id, movie_details_1: response.data };
		next();
	} catch (e) {
		console.error(e);
		res.json({'success': false, 'error': 'TMDb request failed'});
	}
}, async (req, res) => {
	const { imdb_id, movie_details_1 } = req.movie;
	const url = `https://tv-v2.api-fetch.website/movie/${imdb_id}`;
	console.log(`Making a request (${url})`);

	try {
		const response = await axios.get(url);
		const movie_details_2 = response.data;
		res.json({'success': true,  movie_details_1, movie_details_2 });
	} catch (e) {
		console.error(e);
		res.json({'success': false, 'error': 'tv-v2 request failed'});
	}
});


// ============================== start download and return links to movie and subtitles files

var walkSync = function(dir, filelist) {
      var path = path || require('path');
      var fs = fs || require('fs'),
          files = fs.readdirSync(dir);
      filelist = filelist || [];
      files.forEach(function(file) {
          if (fs.statSync(path.join(dir, file)).isDirectory()) {
              filelist = walkSync(path.join(dir, file), filelist);
          }
          else {
              filelist.push(path.join(dir, file));
          }
      });
      return filelist;
};



app.get('/film', async (request, response) => {
	console.log(request.user);

	// language: to request from api user settings
	language = request.user.locale || 'en';

	async function downloadSubtitles_sub(url, name) {

	  const path_vtt = '/tmp/videos/' + imdb_id + '/subs/' + name + '.vtt';

	  // axios image download with response type "stream"
	  const response = await axios({
	    method: 'GET',
	    url: url,
	    responseType: 'stream'
	  })

	  // pipe the result stream into a file on disc
	  // response.data.pipe(fs.createWriteStream(path_srt));
	  response.data.pipe(srt2vtt()).pipe(fs.createWriteStream(path_vtt));

	  // return a promise and resolve when download finishes
	  return new Promise((resolve, reject) => {
	    response.data.on('end', () => {
	      resolve()
	    })

	    response.data.on('error', () => {
	      reject()
	    })
	  })

	}

	imdb_id = request.query.imdb_id;
	resolution = request.query.resolution;

	var return_object = {};

	if (!imdb_id || !resolution || !(resolution =='720p' || resolution == '1080p')) {
	    response.send({success: false, error: "invalid query parameters"});
	    return;
	}

	const {Client}  = require('pg');

	const db = new Client({
	  user: 'Hypertube',
	  host: 'localhost',
	  database: 'Hypertube',
	  password: '12345',
	  port: 5433,
	});

	await db.connect()

	const res = await db.query("SELECT * from popular_films where imdb_id = $1;", [imdb_id]);
	if (!res.rowCount) {
		var sql_update = "insert into popular_films values($1, 1, DEFAULT)";
		var params = [imdb_id];
	} else {
		var sql_update = "update popular_films set count=$1, last_seen=DEFAULT where imdb_id = $2;";
		var params = [parseInt(res.rows[0]['count']) + 1, imdb_id];
	}

	const res2 = await db.query(sql_update, params);
	const res3 = await db.query("insert into history values($1, $2, DEFAULT)", [request.user.id, imdb_id]);
	await db.end()

	var dir_path = "/tmp/videos/" + imdb_id + "/" + resolution;
	var dir_path_subs = "/tmp/videos/" + imdb_id + "/subs";

	if (fs.existsSync(dir_path)) {

		var files_sub = walkSync(dir_path_subs);
		var return_files_sub = {};

		for (var i = files_sub.length - 1; i >= 0; i--) {
			file_name_end = files_sub[i].substring(files_sub[i].length - 7, files_sub[i].length);
			console.log('we have file name end: ');
			console.log(file_name_end);
	        if (file_name_end == '_ru.vtt') {
	        	return_files_sub['ru'] = "http://localhost:3200" + files_sub[i].substring(4, files_sub[i].length);
	        	console.log('we have return_files_sub ru : ' + return_files_sub['ru']);
	        }
	        if (file_name_end == '_en.vtt') {
	        	return_files_sub['en'] = "http://localhost:3200" + files_sub[i].substring(4, files_sub[i].length);
	        	console.log('we have return_files_sub en : ' + return_files_sub['en']);
	        }	        
		}

		var files = walkSync(dir_path);
		var return_file = '';

		for (var i = files.length - 1; i >= 0; i--) {
			ext = pather.extname(files[i]);
	        if (ext == '.mkv' || ext == '.mp4') {
	        	return_file = files[i];
	        }
		}

	    if (return_file) {
	    	return_object['movie_link'] = "http://localhost:3200" + return_file.substring(4, return_file.length);
	    	return_object['subs'] = return_files_sub;
	        console.log("will return link: http://localhost:3200" + return_file.substring(4, return_file.length));
		    return_object['success'] = true;
		    response.send(return_object);
		    return;	        
	    } else {
		    response.send({success: false, error: "no video files aviable for this film"});
		    return;
	    }

	}

    if (!return_object['movie_link']) {

	    if (!fs.existsSync('/tmp/videos')) {
	        fs.mkdirSync('/tmp/videos');
	    }

	    if (!fs.existsSync('/tmp/videos/' + imdb_id)) {
	        fs.mkdirSync('/tmp/videos/' + imdb_id);
	    }

	    if (!fs.existsSync(dir_path)) {
	        fs.mkdirSync(dir_path);
	    }

	    if (!fs.existsSync(dir_path_subs)) {
	        fs.mkdirSync(dir_path_subs);
	        var to_down_subs = true;
	    } else {
	    	var to_down_subs = false;
	    }

	    // download subtitles first:
		if (to_down_subs) {
			// down_subs(imdb_id);
			var result = await OS.search({
				imdbid: imdb_id
			})

			console.log('we have result on OS search: ');
			console.log(result);

			var locales = ['ru', 'en'];

			var arrayLength = locales.length;
			for (var i = 0; i < arrayLength; i++) {
				if (result[locales[i]]) {
					var url  = result[locales[i]]['url'];
					var name = imdb_id + '_' + locales[i];
					await downloadSubtitles_sub(url, name);
					console.log('downloaded subs: ' + name);
					var list_files = walkSync(dir_path_subs);
					console.log('we have such subs files:');
					console.log(list_files);
				}
			}
		}


    	var url2 = 'https://tv-v2.api-fetch.website/movie/' + imdb_id;
		try {
			console.log('MAKING API REQUEST2: ' + url2);
			var films_res2 = await axios({
			  url: url2,
			  raxConfig: {
			    // Retry 3 times on requests that return a response (500, etc) before giving up.  Defaults to 3.
			    retry: 2,

			    // Retry twice on errors that don't return a response (ENOTFOUND, ETIMEDOUT, etc).
			    noResponseRetries: 2,
			 
			    // Milliseconds to delay at first.  Defaults to 100.
			    retryDelay: 100,
			 
			    // HTTP methods to automatically retry.  Defaults to:
			    // ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'PUT']
			    httpMethodsToRetry: ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'PUT'],
			 
			    // The response status codes to retry.  Supports a double
			    // array with a list of ranges.  Defaults to:
			    // [[100, 199], [429, 429], [500, 599]]
			    httpStatusCodesToRetry: [[100, 199], [429, 429], [500, 599]],
			 
			    // If you are using a non static instance of Axios you need
			    // to pass that instance here (const ax = axios.create())
			    // instance: ax,
			 
			    // You can detect when a retry is happening, and figure out how many
			    // retry attempts have been made
			    onRetryAttempt: (err) => {
			      const cfg = rax.getConfig(err);
			      console.log(`Retry attempt (movie list) #${cfg.currentRetryAttempt}`);
			    }
			  }
			});
		} catch(err) {
			// console.log(err);
			response.send({'success': false, 'error': 'api2 failed'});
			return;
		}

		if (!films_res2.data) {
			response.send({'success': false, 'error': 'no torrents for this film was found'});
			return;
		}

		var magnet = films_res2.data['torrents']['en'][resolution]['url'];

		var engine = torrentStream(magnet, {path: dir_path});
	    var return_file = '';


		engine.on('ready', function() {

			for (var i = engine.files.length - 1; i >= 0; i--) {
		        ext = pather.extname(engine.files[i].name);
		        if (ext == '.mkv' || ext == '.mp4') {
					console.log('Start download filename:', engine.files[i].name);
					var stream = engine.files[i].createReadStream();
					var return_file_path = engine.files[i].path;


					stream.on('readable', function() {

						var files_sub = walkSync(dir_path_subs);
						var return_files_sub = {};

						for (var i = files_sub.length - 1; i >= 0; i--) {
							file_name_end = files_sub[i].substring(files_sub[i].length - 7, files_sub[i].length);
					        if (file_name_end == '_ru.vtt') {
					        	return_files_sub['ru'] = "http://localhost:3200" + files_sub[i].substring(4, files_sub[i].length);
					        }
					        if (file_name_end == '_en.vtt') {
					        	return_files_sub['en'] = "http://localhost:3200" + files_sub[i].substring(4, files_sub[i].length);
					        }	        
						}


						return_object['movie_link'] = "http://localhost:3200/videos/" + imdb_id + '/' + resolution + "/" + return_file_path;
				    	return_object['success'] = true;
				    	return_object['subs'] = return_files_sub;
					    response.send(return_object);
					})
				}
			}

		});

	    engine.on('idle', () => {
	    	console.log('finished download');
	    });
    }

});

app.listen(port, (err) => {
    if (err) {
        return console.log('something bad happened', err);
    }
    console.log(`server is listening on ${port}`);
})
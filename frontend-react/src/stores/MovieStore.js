import { observable, action } from "mobx";
import axios from 'axios';

class MovieStore {
    @observable isLoading = false;
    @observable movie = undefined;
    @observable stream = undefined;

    @action setMovie(movie) {
        this.movie = movie;
    }

    @action resetMovie() {
        this.movie = undefined;
    }

    @action setStream(stream) {
        this.stream = stream;
    }

    async fetchMovieDetails(movieId) {
        const url = `http://localhost:3200/film_details/${movieId}`;
        try {
            const response = await axios.get(url, {
                withCredentials: true
            });
            if (response.data.success) {
                const details = response.data.movie_details_1;
                const streaming = response.data.movie_details_2;
                this.setMovie({ ...details, streaming });
                if(streaming){
                    const resolution = Object.keys(Object.values(streaming.torrents)[0])[0];
                    const imdb_id = streaming.imdb_id;
                    this.fetchMovie(imdb_id, resolution);
                }
            } else {
                this.setMovie(null);
            }
        } catch (e) {
            console.error(e);
            this.setMovie(null);
        }
    }
    async fetchMovie(imdb_id, resolution) {
        const url = 'http://localhost:3200/film';
        try {
            const response = await axios.get(url, {
                withCredentials: true,
                params: {
                    imdb_id,
                    resolution
                }
            });
            console.log(response.data);
            this.setStream(response.data);
        } catch (e) {
            console.error(e);
        }
    }
}

export default new MovieStore();
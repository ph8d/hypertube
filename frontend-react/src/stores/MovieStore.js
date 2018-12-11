import { observable, action } from "mobx";
import axios from 'axios';

class MovieStore {
    @observable isLoading = false;
    @observable movie = undefined;
    @observable stream = undefined;
    @observable comments = [];

    @action setMovie(movie) {
        this.movie = movie;
    }

    @action resetMovie() {
        this.movie = undefined;
    }
    @action setComments(comments) {
        this.comments = comments;
    }

    @action addComment(comment) {
        this.comments.unshift(comment);
    }

    @action setStream(stream) {
        this.stream = stream;
    }

    async fetchMovieDetails(movieId) {
        const url = `${process.env.REACT_APP_MOVIE_API_URL}/film_details/${movieId}`;
        try {
            const response = await axios.get(url, {
                withCredentials: true
            });
            if (response.data.success) {
                const { movie_details: details, streaming, subtitles } = response.data;
                this.setMovie({ ...details, streaming, subtitles });
            } else {
                this.setMovie(null);
            }
        } catch (e) {
            console.error(e);
            this.setMovie(null);
        }
    }

    async fetchComments(movieId) {
        const url = `${process.env.REACT_APP_ERL_API_URL}/api/comments`;
        try {
            const response = await axios.get(url, {
                withCredentials: true,
                params: {
                    id: movieId,
                }
            });
            if (response.data.status === 'ok') {
                this.setComments(response.data.payload);
            }
        } catch (e) {
            console.error(e);
        }
    }

    async postComment(movieId, text) { 
        const url = `${process.env.REACT_APP_ERL_API_URL}/api/comments`;
        const body = {imdb_id: movieId, text: text};

        try {
            const response = await axios.post(url, body, {
                withCredentials: true,
            });
            if (response.data.status === 'ok') {
                this.addComment(response.data.payload);
            }
        } catch (e) {
            console.error(e);
        }
    }
}

export default new MovieStore();
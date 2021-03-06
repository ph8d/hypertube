import { observable, action, toJS } from "mobx";
import axios from 'axios';

class LibraryStore {
    _lastSelectedMovie = undefined;
    @observable isLoading = false;

    @observable searchMode = false;
    @observable currentQuery = undefined;

    @observable movies = undefined;
    @observable currentPage = undefined;
    @observable totalPages = undefined;

    @observable filters = {
        "sort_by": "popularity.desc",
        "primary_release_date.gte": "2000-01-01",
        "primary_release_date.lte": "2019-12-31",
        "vote_average.gte": "5",
        "with_genres": []
    }

    @action setIsLoading(status) {
        this.isLoading = status;
    }

    @action setSearchMode(status) {
        this.searchMode = status;
    }

    @action setCurrentQuery(value) {
        this.currentQuery = value;
    }
    
    @action setPage(page) {
        this.currentPage = page;
    }

    @action setTotalPages(pages) {
        this.totalPages = pages;
    }

    @action setFilter(name, value) {
        this.filters[name] = value;
    }

    @action setMovies(movies) {
        this.movies = movies;
    }

    @action pushMovies(moreMovies) {
        this.movies.push(...moreMovies);
    }

    @action setGenres(genres) {
        this.filters.with_genres = genres;
    }

    @action deleteGenre(genreId) {
        const { with_genres } = this.filters;
        const genreToDelete = with_genres.indexOf(genreId);
        with_genres.splice(genreToDelete, 1);
    }

    @action resetFilters() {
        this.filters = {
            "sort_by": "popularity.desc",
            "primary_release_date.gte": "",
            "primary_release_date.lte": "",
            "vote_average.gte": "",
            "with_genres": []
        };
    }

    @action resetMovies() {
        this.movies = undefined;
        this.currentPage = undefined;
        this.totalPages = undefined;
    }

    @action setSelectedMovieAsWatched() {
        const { _lastSelectedMovie } = this
        if (_lastSelectedMovie !== undefined) {
            this.movies[_lastSelectedMovie].watched_films_count = 1;
        }
    }

    async fetchMovies(pageToFetch = 1) {
        const params = this._getDefinedFilters();
        params.page = pageToFetch;
        try {
            this.setIsLoading(true);
            const response = await axios.get(`${process.env.REACT_APP_MOVIE_API_URL}/films`, {
                params,
                withCredentials: true
            });
            if (response.data.success === true) {
                const { page, total_pages, results } = response.data.movies;
                if (pageToFetch === 1) {
                    this.setMovies(results);
                } else {
                    this.pushMovies(results)
                }
                this.setPage(page);
                this.setTotalPages(total_pages);
            } else {
                this.setMovies(null);
                console.log(response.data.error);
            }
        } catch (e) {
            this.setMovies(null);
            console.error(e);
        } finally {
            this.setIsLoading(false);
        }
    }

    async fetchSearchResults(pageToFetch = 1) {
        this.setIsLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_MOVIE_API_URL}/films`, {
                params: { query: this.currentQuery, page: pageToFetch },
                withCredentials: true
            });
            if (response.data.success === true) {
                const { page, total_pages, results } = response.data.movies;
                if (pageToFetch === 1) {
                    this.setMovies(results);
                } else {
                    this.pushMovies(results)
                }
                this.setPage(page);
                this.setTotalPages(total_pages);
            } else {
                this.setMovies(null);
                console.log(response.data.error);
            }
        } catch (e) {
            console.error(e);
        } finally {
            this.setIsLoading(false);
        }
    }

    _getDefinedFilters() {
        const currentFilters = this.filters;
        const definedFilterKeys = [];
        Object.keys(this.filters).forEach(filter => {
            if (this.filters[filter] !== undefined) {
                definedFilterKeys.push(filter);
            }
        });

        let filters = {};
        if (definedFilterKeys.length > 0) {
            definedFilterKeys.forEach(filter => {
                filters[filter] = currentFilters[filter];
            });
        }

        return toJS(filters);
    }
}

export default new LibraryStore();
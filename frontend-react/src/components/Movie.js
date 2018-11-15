import React, {Component} from 'react';
import { inject, observer } from 'mobx-react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import { Typography, Card, ButtonBase, IconButton} from '@material-ui/core';
import not_found from "../img/not_found.jpg";


const styles = theme => ({
	layout: {
		width: 'auto',
		[theme.breakpoints.up(600 + theme.spacing.unit * 2 * 2)]: {
			width: 600,
			marginLeft: 'auto',
			marginRight: 'auto',
		}
	},
	container : {
		display: 'flex',
		flexDirection: 'column',
		marginTop: theme.spacing.unit * 2,
		marginBottom: theme.spacing.unit * 2,
	}
});

@inject('MovieStore') @observer
class Movie extends Component {
    componentDidMount() {
        this.props.MovieStore.fetchMovie(this.props.match.params.id);
    }

    componentWillUnmount() {
        this.props.MovieStore.resetMovie();
    }

    render() {
        const {classes} = this.props;
        const {movie} = this.props.MovieStore;

        if (movie === undefined) {
            return null;
        }
        else {
            return (
                <main className={classes.layout}>
                    <Grid container spacing={8}>
                        <Typography variant="subtitle2" color="textSecondary">
                            {movie.title}
                        </Typography>
                        <Typography variant="subtitle2" color="textSecondary">
                            {movie.overview}
                        </Typography>
                        <Typography variant="subtitle2" color="textSecondary">
                            <img src={movie.streaming.images.poster}/>
                        </Typography>
                    </Grid>
                </main>
            );
        }
    }
}

Movie.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Movie);
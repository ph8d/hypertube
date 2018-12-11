import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';

const styles = {
	footer: {
		position: 'absolute',
		bottom: '0',
		backgroundColor: '#f1f3f4',
		width: '100%',
		padding: '8px'

  }
};

class Footer extends Component {
	render() {
		const { classes } = this.props;
		return (
			<footer className={classes.footer}>
				<Typography variant="body2" align="center" color="textSecondary">
					rtarasen © 2018
				</Typography>
			</footer>
		);
	}
};

export default withStyles(styles)(Footer);

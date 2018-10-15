import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';

const styles = {
  footer: {
    backgroundColor: '#4d4d4d',
    color: '#f2f2f2',
    textAlign: 'center',
  },
};

class Footer extends Component {
	render() {
		const { classes } = this.props;
		return (
			<Typography className={classes.footer}>
	  			<div className="foter">aklimchu lmalaya kbovt rtarasen</div>
	  			<div>© 2018</div> 
			 </Typography>

		);
	}
};

export default withStyles(styles)(Footer);
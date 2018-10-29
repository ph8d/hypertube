import { observable, action } from "mobx";
import * as EmailValidator from 'email-validator';
import axios from 'axios';

class AuthStore {
    @observable fields = {
        fname: '',
        lname: '',
        uname: '',
        email: '',
        password: '',
        confirmPassword: ''
    }

    @observable errors = {
        fname: '',
        lname: '',
        uname: '',
        email: '',
        password: '',
        confirmPassword: ''
    }

    @action setFieldValue(name, value) {
        this.fields[name] = value;
        this.errors[name] = '';
    }

    @action setError(fieldName, error) {
        this.errors[fieldName] = error;
    }

    @action setErrors(errors) {
        Object.keys(errors).forEach(field => {
            this.errors[field] = errors[field];
        });
    }

    async register() {
        if (this._validateFields(['fname','lname','uname','email','password','confirmPassword'])) {
            const { ...fields } = this.fields;

            const response = await axios.post('http://localhost:8080/api/auth/registration', fields, {withCredentials: true});
            console.log(response);
            if (response.data.status === "ok") {
                // email is sent and we to need notify user about it in some form
            } else if (response.data.status === "error") {
                this.setErrors(response.data.reason);
            }
        }
    }

    async login() {
        console.log('AAAA');
        if (this._validateFields(['uname','password'])) {
            console.log('AAAA2');
            const { uname, password } = this.fields;
            const response = await axios.post('http://localhost:8080/api/auth/login', { uname, password }, {withCredentials: true});
            console.log(response);
            if (response.data.status === 'ok') {

            } else {

            }
        }
    }

    async lostPass() {
        if (this._validateFields(['email'])) {
            
        }
    }

    @action resetStore() {
        this.fields = {
            fname: '',
            lname: '',
            uname: '',
            email: '',
            password: '',
            confirmPassword: ''
        };

        this.errors = {
            fname: '',
            lname: '',
            uname: '',
            email: '',
            password: '',
            confirmPassword: ''
        };
    }

    _validateFields(fields) {
        console.log(this.errors);

        let isValid = true;

        const {
            fname,
            lname,
            uname,
            email,
            password,
            confirmPassword
        } = this.fields;

        fields.forEach(name => {
            if (name === "uname") {
                if (uname.length < 6){
                    this.setError(name, "Username is too short.");
                    isValid = false;
                }
                else if (uname.length > 16) {
                    this.setError(name, "Username is too long");
                    isValid = false;
                }
            }
            else if (name === "fname"){
                if (fname.length < 1){
                    this.setError(name, "First name is too short.");
                    isValid = false;
                }
                else if (fname.length > 50) {
                    this.setError(name, "First name is too long");
                    isValid = false;
                }
            }
            else if (name === "lname"){
                if (lname.length < 1){
                    this.setError(name, "Last name is too short.");
                    isValid = false;
                }
                else if (lname.length > 50) {
                    this.setError(name, "Last name is too long");
                    isValid = false;
                }
            }
            else if (name === "password"){
                if (password.length < 8){
                    this.setError(name, "Password is too short.");
                    isValid = false;
                }
                else if (password.length > 20) {
                    this.setError(name, "Password is too long");
                    isValid = false;
                }
            }
            else if (name === "confirmPassword") {
                if (password !== confirmPassword) {
                    this.setError("confirmPassword", "Passwords doesn't match.");
                    isValid = false;
                }
            }
            else if (name === "email"){
                if (EmailValidator.validate(email) === false){
                    this.setError(name, "Email is invalid.");
                    isValid = false;
                }
            }

        });
        const { ...errors } = this.errors;
        console.log(errors);
        return isValid;
    }
}

export default new AuthStore();

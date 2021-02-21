const { User } = require("../models");
const brcypt = require("bcryptjs");
const { UserInputError } = require("apollo-server")
module.exports = {
    Query: {
        getUsers: async () => {
            try {
                return await User.findAll();
            } catch (error) {
                console.log(error);
            }
        }
    },
    Mutation: {
        register: async (_, args) => {
            let errors = {}
            let { username, email, password, confirmPassword } = args
            try {

                if (username.trim() === '') errors.username = 'Username cannot be empty';
                if (email.trim() === '') errors.email = 'Email cannot be empty';
                if (password.trim() === '') errors.password = 'Password cannot be empty';
                if (confirmPassword.trim() === '') errors.confirmPassword = 'Confirm Password cannot be empty';
                if (password !== confirmPassword) errors.password = 'Password must matched';

                if (Object.keys(errors).length > 0) {
                    throw errors
                }
                
                password = await brcypt.hash(password, 6)
                const user = await User.create(
                    {
                        username,
                        email,
                        password
                    })

                return user;
            } catch (error) {
                if (['SequelizeValidationError', 'SequelizeUniqueConstraintError'].includes(error.name)) {
                    error.errors.forEach(e => (errors[e.path] = e.message))
                }
                console.log(error);
                throw new UserInputError('Bad Input', { errors })
            }
        }
    }
};
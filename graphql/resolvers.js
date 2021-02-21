const brcypt = require("bcryptjs");
const { UserInputError, AuthenticationError } = require("apollo-server")
const jwt = require("jsonwebtoken")

const { User } = require("../models");
const { Op } = require("sequelize")
const { JWT_SECRET } = require("../config/env.json")
module.exports = {
    Query: {
        getUsers: async (_, __, context) => {
            try {
                let user;
                if (context.req && context.req.headers.authorization) {
                    const token = context.req.headers.authorization.split("Bearer ")[1]
                    jwt.verify(token, JWT_SECRET, (err, decoedToken) => {
                        if (err) {
                            throw new AuthenticationError('Unauthenticated')
                        }
                        user = decoedToken
                    })
                }
                const users = await User.findAll({
                    where: { username: { [Op.ne]: user.username } },
                });

                return users;
            } catch (error) {
                console.log(error);
                throw error;
            }
        },
        login: async (_, args) => {
            let errors = {}
            const { username, password } = args
            try {

                if (username.trim() === '') errors.username = 'Username cannot be empty';
                if (password.trim() === '') errors.password = 'Password cannot be empty';

                if (Object.keys(errors).length > 0) {
                    throw new UserInputError('bad input', { errors })
                }
                const user = await User.findOne(
                    {
                        where: { username }
                    })
                if (!user) {
                    errors.username = 'User not found'
                    throw new UserInputError('User not found', { errors })
                }
                const checkPassword = await brcypt.compare(password, user.password)
                if (!checkPassword) {
                    errors.password = 'Password is incorrect'
                    throw new AuthenticationError('Password is incorrect', { errors })
                }

                const token = jwt.sign({ username }, JWT_SECRET, {
                    expiresIn: 60 * 60
                });
                user.token = token

                return {
                    ...user.toJSON(),
                    createdAt: user.createdAt.toISOString(),
                    token
                };

            } catch (error) {
                console.log(error);
                throw error
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
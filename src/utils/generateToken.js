import { ApiError } from '../utils/ApiErrors.js';
import { User } from '../models/user.model.js';

export const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        // storing value in user model
        user.accessToken = accessToken;
        await user.save({ validateBeforeSave: false })

        // return response
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, 'Something went wrong while generating access and refresh token.')
    }
}
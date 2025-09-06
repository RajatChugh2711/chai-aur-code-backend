import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateAccessAndRefreshToken } from "../utils/generateToken.js";
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { username, fullName, email, password } = req.body;

  // validation - not empty
  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if the user already exists or not: email, usernmae
  const isUserExists = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (isUserExists) {
    throw new ApiError(409, "A user already exists with this email.");
  }
  // check for avatar image
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar Image is required");
  }
  // upload avatar image to cloudinary
  const avatarImageResponse = await uploadToCloudinary(avatarLocalPath);
  //   console.log(avatarImageResponse, "image avatar");

  const coverImageResponse = await uploadToCloudinary(coverImageLocalPath);
  //   console.log(coverImageResponse, "image cover");

  if (!avatarImageResponse) {
    throw new Error(400, "Avatar image is required");
  }

  // create a user object - creating entry to db
  const user = await User.create({
    fullName,
    email,
    username: username?.toLowerCase(),
    avatar: avatarImageResponse?.url || "",
    coverImage: coverImageResponse?.url || "",
    password,
  });

  // remove password and refresh token from the response
  const createdUser = await User.findById(user?._id).select("-password -refreshToken");

  // check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while user creation.");
  }
  // return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body ==> data
  const { email, username, password } = req.body;
  // username or email
  if (!(email || username)) {
    throw new ApiError(400, 'Invalid Credentials')
  }
  // find the user
  const user = await User.findOne({
    $or: { email, username }
  })

  if (!user) {
    throw new ApiError(404, "User doesn't exists.")
  }
  // password check
  const isPasswordValidated = await user.isPasswordCorrect(password);

  if (!isPasswordValidated) {
    throw new ApiError(401, 'Invalid user credentials')
  }
  // access and refresh token generate
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user?._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
  // send access and refresh token to the cookie
  const options = {
    httpOnly: true,
    secure: true
  }
  return res.status(200).cookie('accessToken', accessToken).cookie('refreshToken', refreshToken)
    .json(new ApiResponse(200, {
      user: loggedInUser,
      accessToken,
      refreshToken
    },
      "User logged in successfully"
    ))
})

const logoutUser = asyncHandler(async (req, res) => {
  User.findByIdAndUpdate(req.user?._id, {
    $set: {
      refreshToken: undefined
    },
  },
  {
    new: true
  }
);

  const options = {
    httpOnly: true,
    secure: true
  }
  // return response
  return res.status(200).clearCookie('accessToken', options).clearCookie('refreshToken', options)
  .json(new ApiResponse(200, {}, 'User logged out successfully'))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.headers.accessToken || req.body.accessToken;
  
  // if not refresh token
  if(!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized Token')
  }

  jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET_KEY, async (err, decoded) => {
    if(err) {
      throw new ApiError(403, 'Forbidden Token')
    }

    const user = await User.findById(decoded._id)

    if(!user || user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(403, 'Forbidden Token')
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user?._id);

    // send access and refresh token to the cookie
    const options = {
      httpOnly: true,
      secure: true
    }
    return res.status(200).cookie('accessToken', accessToken, options).cookie('refreshToken', refreshToken, options)
      .json(new ApiResponse(200, {
        accessToken,
        refreshToken
      },
        "Access token generated successfully"
      ))
  })

})

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if ([oldPassword, newPassword].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findById(req.user?._id).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isOldPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({validateBeforeSave: false});

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
   const {fullName, email} = req.body;

   if([fullName, email].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
   }
   const user = await User.findByIdAndUpdate(req.user?._id, { $set: { fullName, email } }, {new: true}).select("-password");
    if(!user) {
      throw new ApiError(404, "User not found");
    }
    return res.status(200).json(new ApiResponse(200, user, "User details updated successfully"));
});

const updateUserAvatarImage = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.files?.avatar[0]?.path;
  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }
  const avatarImageResponse = await uploadToCloudinary(avatarLocalPath);
  if(!avatarImageResponse) {
    throw new ApiError(500, "Something went wrong while uploading avatar image");
  }
  const user = await User.findByIdAndUpdate(req.user?._id, { $set: { avatar: avatarImageResponse?.url || "" } }, {new: true}).select("-password");
  if(!user) {
    throw new ApiError(404, "User not found");
  }
  return res.status(200).json(new ApiResponse(200, user, "User avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if(!coverImageLocalPath) {
    throw new ApiError(400, "Cover image is required");
  }
  const coverImageResponse = await uploadToCloudinary(coverImageLocalPath);
  if(!coverImageResponse) {
    throw new ApiError(500, "Something went wrong while uploading cover image");
  }
  const user = await User.findByIdAndUpdate(req.user?._id, { $set: { coverImage: coverImageResponse?.url || "" } }, {new: true}).select("-password");
  if(!user) {
    throw new ApiError(404, "User not found");
  }
  return res.status(200).json(new ApiResponse(200, user, "User cover image updated successfully"));
});

export const getUserChannelProfile = asyncHandler(async (req, res) => {
  const {username} = req.params;

  if(!username) {
    throw new ApiError(400, "Username is required");
  }
  const channel = await User.aggregate([
    {
      $match: { username: username?.toLowerCase() }
    },
    {
      $lookup: {
        from: 'subscription',
        localField: '_id',
        foreignField: 'channel',
        as: 'subscribers'
      }
    },
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'subscriber',
        as: 'subscribedChannels'
      }
    },
    {
      $addFields: {
        subscribersCount: { $size: '$subscribers' },
        subscribedChannelsCount: { $size: '$subscribedChannels' },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, '$subscribers.subscriber'] },
            then: true,
            else: false
          }
        }
      }
    },{
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        subscribedChannelsCount: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      }
    }
    
  ])

  if(!channel) {
    throw new ApiError(404, "Channel not found");
  }

  return res.json(new ApiResponse(200, channel[0], "Channel fetched successfully"));
})

export const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(req.user?._id) }
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'watchHistory',
        foreignField: '_id',
        as: 'watchHistory',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              localField: 'owner',
              foreignField: '_id',
              as: 'owner',
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: { $first: '$owner' }
            }
          }
        ]
      }
    }, 
  ])

  if(!user) {
    throw new ApiError(404, "User not found");
  }

  return res.json(new ApiResponse(200, user[0]?.watchHistory || [], "Watch history fetched successfully"));
})
export { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, updateAccountDetails, updateUserAvatarImage, updateCoverImage, getUserChannelProfile, getWatchHistory };
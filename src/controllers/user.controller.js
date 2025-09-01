import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateAccessAndRefreshToken } from "../utils/generateToken.js";

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

export { registerUser, loginUser, logoutUser };

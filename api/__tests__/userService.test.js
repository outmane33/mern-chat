const User = require("../models/userModel");
const {
  updateProfile,
  getUsersForSidebar,
} = require("../services/userService.js");
const cloudinary = require("../utils/coudinary.js");

jest.mock("../models/userModel");
jest.mock("../utils/coudinary.js");

describe("updateProfile", () => {
  it("should update profile picture and return updated user data", async () => {
    // Mock request, response, and next
    const req = {
      user: { _id: "mockUserId" },
      body: { profilePic: "mockProfilePicBase64Data" },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    // Mock cloudinary upload response
    cloudinary.uploader.upload.mockResolvedValue({
      secure_url: "http://mock-image-url.com",
    });

    // Mock user update response
    const mockUser = {
      _id: "mockUserId",
      profilePic: "http://mock-image-url.com",
    };
    User.findByIdAndUpdate.mockResolvedValue(mockUser);

    // Call the updateProfile function
    await updateProfile(req, res, next);

    // Assertions
    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      "mockProfilePicBase64Data"
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "mockUserId",
      { profilePic: "http://mock-image-url.com" },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      user: mockUser,
    });
  });
  it("should handle error if Cloudinary upload fails", async () => {
    // Mock request, response, and next
    const req = {
      user: { _id: "mockUserId" },
      body: { profilePic: "mockProfilePicBase64Data" },
    };
    const res = {};
    const next = jest.fn();

    // Mock cloudinary upload to throw an error
    cloudinary.uploader.upload.mockRejectedValue(
      new Error("Cloudinary upload failed")
    );

    // Call the updateProfile function
    await updateProfile(req, res, next);

    // Assertions
    expect(next).toHaveBeenCalledWith(new Error("Cloudinary upload failed"));
  });
  it("should handle error if User.update fails", async () => {
    // Mock request, response, and next
    const req = {
      user: { _id: "mockUserId" },
      body: { profilePic: "mockProfilePicBase64Data" },
    };
    const res = {};
    const next = jest.fn();

    // Mock cloudinary upload to succeed
    cloudinary.uploader.upload.mockResolvedValue({
      secure_url: "http://mock-image-url.com",
    });

    // Mock user update to throw an error
    User.findByIdAndUpdate.mockRejectedValue(new Error("User update failed"));

    // Call the updateProfile function
    await updateProfile(req, res, next);

    // Assertions
    expect(next).toHaveBeenCalledWith(new Error("User update failed"));
  });
});

describe("getUsersForSidebar", () => {
  it("should return a list of users excluding the current user", async () => {
    // Mock request, response, and next
    const req = {
      user: { _id: "mockUserId" },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    // Mock User.find response
    const mockUsers = [
      { _id: "user1", email: "user1@example.com", fullName: "User One" },
      { _id: "user2", email: "user2@example.com", fullName: "User Two" },
    ];
    User.find.mockResolvedValue(mockUsers);

    // Call the getUsersForSidebar function
    await getUsersForSidebar(req, res, next);

    // Assertions
    expect(User.find).toHaveBeenCalledWith({ _id: { $ne: "mockUserId" } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      users: mockUsers.map((user) => ({
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
      })),
    });
  });
  it("should handle error if User.find fails", async () => {
    // Mock request, response, and next
    const req = {
      user: { _id: "mockUserId" },
    };
    const res = {};
    const next = jest.fn();

    // Mock User.find to throw an error
    User.find.mockRejectedValue(new Error("Database query failed"));

    // Call the getUsersForSidebar function
    await getUsersForSidebar(req, res, next);

    // Assertions
    expect(next).toHaveBeenCalledWith(new Error("Database query failed"));
  });
});

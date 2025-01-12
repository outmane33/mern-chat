const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
  signIn,
  signUp,
  signOut,
  protect,
  checkAuth,
} = require("../services/authService");
const User = require("../models/userModel");
const { generateToken } = require("../utils/generateToken");
const ApiError = require("../utils/apiError");
const { sanitizeUser } = require("../utils/sanitizeData");

jest.mock("../models/userModel");
jest.mock("bcryptjs");
jest.mock("../utils/generateToken");
jest.mock("../utils/sanitizeData");
jest.mock("jsonwebtoken");

describe("signIn", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {
        email: "test@example.com",
        password: "password123",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  test("should return 200 and set a cookie if the credentials are valid", async () => {
    const mockUser = {
      email: "test@example.com",
      password: "hashedPassword",
    };
    const mockToken = "mockToken";

    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    generateToken.mockReturnValue(mockToken);

    await signIn(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ email: req.body.email });
    expect(bcrypt.compare).toHaveBeenCalledWith(
      req.body.password,
      mockUser.password
    );
    expect(generateToken).toHaveBeenCalledWith(mockUser);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.cookie).toHaveBeenCalledWith(
      "access_token",
      mockToken,
      expect.objectContaining({
        httpOnly: true,
        secure: expect.any(Boolean),
        sameSite: "strict",
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      user: mockUser,
    });
  });

  test("should call next with ApiError for invalid username or password", async () => {
    User.findOne.mockResolvedValue(null);

    await signIn(req, res, next);

    expect(next).toHaveBeenCalledWith(
      new ApiError("Invalid username or password", 401)
    );
  });

  test("should call next with ApiError if password comparison fails", async () => {
    const mockUser = {
      email: "test@example.com",
      password: "hashedPassword",
    };

    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    await signIn(req, res, next);

    expect(next).toHaveBeenCalledWith(
      new ApiError("Invalid username or password", 401)
    );
  });
});

describe("signUp", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {
        email: "test@example.com",
        fullName: "John Doe",
        password: "password123",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it("should create a user, generate a token, set a cookie, and return sanitized user data", async () => {
    const mockUser = {
      email: "test@example.com",
      fullName: "John Doe",
      password: "hashedPassword",
      toObject: jest.fn().mockReturnValue({
        email: "test@example.com",
        fullName: "John Doe",
      }),
    };
    const mockToken = "mockToken";
    const sanitizedUser = {
      email: "test@example.com",
      fullName: "John Doe",
    };

    User.create.mockResolvedValue(mockUser);
    generateToken.mockReturnValue(mockToken);
    sanitizeUser.mockReturnValue(sanitizedUser);

    await signUp(req, res, next);

    expect(User.create).toHaveBeenCalledWith({
      email: req.body.email,
      fullName: req.body.fullName,
      password: req.body.password,
    });
    expect(generateToken).toHaveBeenCalledWith(mockUser);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.cookie).toHaveBeenCalledWith(
      "access_token",
      mockToken,
      expect.objectContaining({
        httpOnly: true,
        secure: expect.any(Boolean),
        sameSite: "strict",
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      user: sanitizedUser,
    });
  });

  it("should call next with an error if user creation fails", async () => {
    User.create.mockRejectedValue(new Error("User creation failed"));

    await signUp(req, res, next);

    expect(next).toHaveBeenCalledWith(new Error("User creation failed"));
  });
});

describe("signOut", () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  test("should clear the access_token cookie and send a success response", async () => {
    await signOut(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.clearCookie).toHaveBeenCalledWith("access_token");
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
    });
  });

  test("should not call next since no error is expected", async () => {
    await signOut(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});

describe("protect middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      cookies: {
        access_token: "mockToken",
      },
    };
    res = {};
    next = jest.fn();
  });

  it("should return an error if no token is provided", async () => {
    req.cookies.access_token = null;

    await protect(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].message).toBe("You are not logged in");
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it("should return an error if token verification fails", async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    await protect(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(
      "mockToken",
      process.env.JWT_SECRET
    );
    expect(next).toHaveBeenCalledWith(expect.any(Error)); // Expect any standard Error
    expect(next.mock.calls[0][0].message).toBe("Invalid token");
  });

  it("should return an error if the user does not exist", async () => {
    jwt.verify.mockReturnValue({ id: "mockUserId" });
    User.findById.mockResolvedValue(null);

    await protect(req, res, next);

    expect(User.findById).toHaveBeenCalledWith("mockUserId");
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].message).toBe("User not found");
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });

  it("should add the user to req and call next on success", async () => {
    const mockUser = {
      id: "mockUserId",
      email: "test@example.com",
      fullName: "John Doe",
    };
    jwt.verify.mockReturnValue({ id: "mockUserId" });
    User.findById.mockResolvedValue(mockUser);

    await protect(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(
      "mockToken",
      process.env.JWT_SECRET
    );
    expect(User.findById).toHaveBeenCalledWith("mockUserId");
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalledWith();
  });
});

describe("checkAuth", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {
        id: "mockUserId",
        email: "test@example.com",
        fullName: "John Doe",
        password: "hashedPassword123", // Sample password
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it("should return 200 and sanitized user data if req.user exists", async () => {
    const sanitizedUser = {
      id: "mockUserId",
      email: "test@example.com",
      fullName: "John Doe",
    };

    // Mocking sanitizeUser to return a sanitized user
    sanitizeUser.mockReturnValue(sanitizedUser);

    // Call the checkAuth function
    await checkAuth(req, res, next);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    expect(sanitizeUser).toHaveBeenCalledWith(req.user); // Ensure sanitizeUser is called with req.user
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      user: sanitizedUser,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 200 with null user data if req.user is null", async () => {
    req.user = null;

    await checkAuth(req, res, next);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      user: null,
    });

    expect(sanitizeUser).toHaveBeenCalled();

    expect(next).not.toHaveBeenCalled();
  });
});

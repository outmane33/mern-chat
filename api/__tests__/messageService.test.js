const Message = require("../models/messageModel");
const { getMessages, sendMessage } = require("../services/messageService");
const cloudinary = require("../utils/coudinary.js");
const { getReceiverSocketId, io } = require("../utils/socket.js");

jest.mock("../models/messageModel");
jest.mock("../utils/coudinary.js");
jest.mock("../utils/socket.js");

describe("getMessages", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { _id: "mockUserId" }, // Simulate the logged-in user
      params: { id: "mockReceiverId" }, // Simulate the receiver's ID
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it("should return 200 with messages if messages are found", async () => {
    const mockMessages = [
      {
        senderId: "mockUserId",
        receiverId: "mockReceiverId",
        content: "Hello",
      },
      {
        senderId: "mockReceiverId",
        receiverId: "mockUserId",
        content: "Hi there",
      },
    ];

    // Mocking Message.find to return the mock messages
    Message.find.mockResolvedValue(mockMessages);

    await getMessages(req, res, next);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      messages: mockMessages,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 200 with an empty messages array if no messages are found", async () => {
    // Mocking Message.find to return an empty array
    Message.find.mockResolvedValue([]);

    await getMessages(req, res, next);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      messages: [],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next with an error if an error occurs while fetching messages", async () => {
    // Mocking Message.find to throw an error
    const error = new Error("Database error");
    Message.find.mockRejectedValue(error);

    await getMessages(req, res, next);

    // Assertions
    expect(next).toHaveBeenCalledWith(error); // Ensure the error is passed to the next middleware
  });
});

describe("sendMessage", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { _id: "mockSenderId" },
      params: { id: "mockReceiverId" },
      body: { text: "Hello", image: "base64ImageString" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it("should upload image, create a message, and emit a real-time event", async () => {
    const mockImageUrl = "http://mock-image-url.com";
    const mockMessage = {
      senderId: "mockSenderId",
      receiverId: "mockReceiverId",
      text: "Hello",
      image: mockImageUrl,
    };

    // Mocking Cloudinary upload response
    cloudinary.uploader.upload.mockResolvedValue({ secure_url: mockImageUrl });

    // Mocking Message.create to return the mock message
    Message.create.mockResolvedValue(mockMessage);

    // Mocking getReceiverSocketId to return a mock socket ID
    getReceiverSocketId.mockReturnValue("mockSocketId");

    // Mocking socket emit method
    io.to = jest.fn().mockReturnThis();
    io.to().emit = jest.fn();

    await sendMessage(req, res, next);

    // Assertions
    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      "base64ImageString"
    );
    expect(Message.create).toHaveBeenCalledWith({
      senderId: "mockSenderId",
      receiverId: "mockReceiverId",
      text: "Hello",
      image: mockImageUrl,
    });
    expect(io.to).toHaveBeenCalledWith("mockSocketId");
    expect(io.to().emit).toHaveBeenCalledWith("newMessage", mockMessage);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      message: mockMessage,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should create a message without image and emit a real-time event", async () => {
    req.body.image = undefined;

    const mockMessage = {
      senderId: "mockSenderId",
      receiverId: "mockReceiverId",
      text: "Hello",
      image: undefined,
    };

    Message.create.mockResolvedValue(mockMessage);

    cloudinary.uploader.upload.mockResolvedValue({
      secure_url: "http://mock-image-url.com",
    });

    getReceiverSocketId.mockReturnValue("mockSocketId");

    io.to = jest.fn().mockReturnThis();
    io.to().emit = jest.fn();

    await sendMessage(req, res, next);

    expect(Message.create).toHaveBeenCalledWith({
      senderId: "mockSenderId",
      receiverId: "mockReceiverId",
      text: "Hello",
      image: undefined,
    });
    expect(io.to).toHaveBeenCalledWith("mockSocketId");
    expect(io.to().emit).toHaveBeenCalledWith("newMessage", mockMessage);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      message: mockMessage,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should handle error if Cloudinary upload fails", async () => {
    const error = new Error("Cloudinary upload failed");
    cloudinary.uploader.upload.mockRejectedValue(error);

    await sendMessage(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("should handle error if Message.create fails", async () => {
    const error = new Error("Message creation failed");

    cloudinary.uploader.upload.mockResolvedValue({
      secure_url: "http://mock-image-url.com",
    });

    Message.create.mockRejectedValue(error);

    await sendMessage(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

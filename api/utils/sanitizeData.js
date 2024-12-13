exports.sanitizeUser = (user) => {
  return {
    _id: user._id,
    email: user.email,
    fullName: user.fullName,
    profilePic: user.profilePic,
    createdAt: user.createdAt,
  };
};

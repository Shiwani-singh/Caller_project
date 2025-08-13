export const getLogin = (req, res) => {
  res.render("login");
};

export const postLogin = async (req, res) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      const errorMessages = result.error.issues.map((err) => {
        if (err.path[0] === "email") return "Invalid email address.";
        if (err.path[0] === "password") return "Password is too short.";
        return "Please fill the valid email or password.";
      });
      req.flash("error", errorMessages);
      return res.redirect("/login");
    }

    const { email, password } = result.data;
    const user = await User.findOne({ email });

    if (!user) {
      req.flash("error", "User not found, Please Signup");
      return res.redirect("/login");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      req.flash("error", "Invalid Password");
      return res.redirect("/login");
    }

    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone
    };

    res.redirect("/dashboard");
    console.log("User logged in:", user.name);
    req.flash("success", "Login successful!");

  } catch (err) {
    console.error(err);
    req.flash("error", "Server error");
    return res.redirect("/login");
  }
};
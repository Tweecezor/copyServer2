const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const jwtDecode = require("jwt-decode");
const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const platform = process.platform;
const util = require("util");
const rename = util.promisify(fs.rename);
const moment = require("moment");
const passport = require("passport");
const tokenValidation = require("../middleware/validationToken");

const upload = require("../middleware/uploads");

const router = Router();
const modelGROUPS = require("../models/index").GROUPS;
const modelQUESTIONS = require("../models/index").QUESTIONS;
const modelRESULTS = require("../models/index").RESULTS;
const modelTESTS = require("../models/index").TESTS;
const modelUSER = require("../models/index").USER;
const modelPASSING_TEST_USERS = require("../models/index").PASSING_TEST_USERS;
const modelSUBJECTS = require("../models/index").SUBJECTS;

//Группы
// function middle(req, res, next) {
//   console.log("alalalall");
//   console.log(req.body);
//   next();
// }

//Добавление нового студента
router.patch(
  "/groups/addStudent/:id",
  // passport.authenticate("jwt", { session: false }),
  // tokenValidation,
  async (req, res) => {
    // console.log(req.headers.authorization);
    try {
      const currentGroup = await modelGROUPS.findOne({
        group_id: req.params.id,
        creatorId: req.body.creatorId,
      });
      let studentsInGroupPrev = currentGroup.studentsInGroup;
      studentsInGroupPrev.push(req.body);

      await modelGROUPS.findByIdAndUpdate(currentGroup._id, {
        studentsInGroup: studentsInGroupPrev,
      });
      const currentGroupUpdated = await modelGROUPS.findOne({
        group_id: req.params.id,
      });
      res.send(currentGroupUpdated);
    } catch (error) {
      res
        .status(400)
        .json({ message: "Произошла ошибка при добавлении студента" });
    }
  }
);

//изменение данных студента в группе
router.patch(
  "/groups/patchStudent/:id",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      // console.log(req.body);
      const currentGroup = await modelGROUPS.findOne({
        group_id: req.params.id,
      });
      let studentsInGroupPrev = currentGroup.studentsInGroup;
      studentsInGroupPrev = studentsInGroupPrev.map((student) => {
        return student.student_id === req.body.student_id ? req.body : student;
      });
      await modelGROUPS.findByIdAndUpdate(currentGroup._id, {
        studentsInGroup: studentsInGroupPrev,
      });
      await modelRESULTS.findOneAndUpdate(
        {
          group_id: req.params.id,
          student_id: req.body.student_id,
        },
        {
          fullName: req.body.fullName,
        }
      );
    } catch (error) {
      res
        .status(400)
        .json({ message: "Произошла ошибка при изменении данных студента" });
    }
  }
);

//удаление студента по id
router.patch(
  "/groups/deleteStudent/:id",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      // console.log(req.body);
      const currentGroup = await modelGROUPS.findOne({
        group_id: req.params.id,
      });
      let studentsInGroupPrev = currentGroup.studentsInGroup;
      studentsInGroupPrev = studentsInGroupPrev.filter((student) => {
        return student.student_id != req.body.student_id ? student : "";
      });
      await modelGROUPS.findByIdAndUpdate(currentGroup._id, {
        studentsInGroup: studentsInGroupPrev,
      });
      await modelRESULTS.findOneAndDelete({
        group_id: req.params.id,
        student_id: req.body.student_id,
      });
      const currentGroupUpdated = await modelGROUPS.findOne({
        group_id: req.params.id,
      });
      res.send(currentGroupUpdated);
    } catch (error) {
      res.status(400).json({
        message: "Ошибка при удалении студента",
      });
    }
  }
);

//изменения названия группы и  email старосты
router.patch(
  "/groups/:id",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      await modelGROUPS.findByIdAndUpdate(req.params.id, {
        groupName: req.body.groupName,
        headmanEmail: req.body.headmanEmail,
      });
      const currentTests = await modelTESTS.find({
        group_id: req.body.group_id,
      });
      currentTests.forEach(async (test) => {
        await test.updateOne({ group: req.body.groupName });
      });
      const resultsOfCurrentGroup = await modelRESULTS.find({
        group_id: req.body.group_id,
      });
      resultsOfCurrentGroup.forEach(async (result) => {
        await result.updateOne({ group: req.body.groupName });
      });
      res.status(200).json({ message: "Название теста успешно изменено" });
    } catch (error) {
      res
        .status(400)
        .json({ message: "Произошла ошибка при изменении данных" });
    }
    // await currentTest.updateMany({ group: req.body.groupName });
  }
);

//создание новой группы со студентами
router.post(
  "/groups",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const group = new modelGROUPS({
        group_id: req.body.group_id,
        groupName: req.body.groupName,
        headmanEmail: req.body.headmanEmail,
        studentsInGroup: req.body.studentsInGroup,
        creatorId: req.body.creatorId,
      });
      await group
        .save()
        .then((doc) => {
          return doc;
        })
        .catch(function(err) {
          console.log(err);
        });
      res.send(group);
    } catch (error) {
      res.status(400).json({ message: "Ошибка при создании группы" });
    }
  }
);

//удаление группы
router.delete(
  "/groups/:id",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      await modelGROUPS.deleteOne({ group_id: req.params.id });
      await modelTESTS.deleteMany({ group_id: req.params.id });
      await modelRESULTS.deleteMany({ group_id: req.params.id });
      res.send({ type: "success" });
    } catch (error) {
      res.status(400).json({
        message: "Ошибка при удалении группы",
      });
    }
  }
);

//вывод всех существующих групп
router.get("/groups/:creatorId", async (req, res) => {
  // console.log(req.params);
  try {
    const Groups = await modelGROUPS.find({
      creatorId: `${req.params.creatorId}`,
    });
    res.send(Groups);
  } catch (error) {
    res.status(400).json({ message: "Произошла ошибка при загрузке групп" });
  }
});

/////ВОПРОСЫ
//получение всех вопросов
router.get("/questions/:creatorId", async (req, res) => {
  try {
    const Questions = await modelQUESTIONS.find({
      creatorId: `${req.params.creatorId}`,
    });
    res.send(Questions);
  } catch (error) {
    res.status(400).json({ message: "Ошибка при получении вопросов" });
  }
});

// router.get("/getAnswer", async (req, res) => {
//   // 5eda9c0ea700ae072c8e05b6
//   const answer = await modelQUESTIONS.findOne({});
//   console.log(answer);
// });

//добавление нового вопроса
// router.post("/questions", upload.single("image"), async (req, res) => {
router.post(
  "/questions",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      if (req.body.type === "handwritingAnswer") {
        const question = new modelQUESTIONS({
          type: req.body.type,
          question: {
            text: req.body.question.text,
            img: req.body.question.img,
            question_id: req.body.question.question_id,
          },
          keywordsArray: req.body.keywordsArray,
          level_id: req.body.level_id,
          test_id: req.body.test_id,
        });
        await question
          .save()
          .then((doc) => {
            return doc;
          })
          .catch(function(err) {
            console.log(err);
          });
        res.send(question);
      } else {
        const question = new modelQUESTIONS({
          type: req.body.type,
          question: {
            text: req.body.question.text,
            img: req.body.question.img,
            question_id: req.body.question.question_id,
          },
          answers: req.body.answers,
          level_id: req.body.level_id,
          test_id: req.body.test_id,
          questionID: req.body.questionID,
          creatorId: req.body.creatorId,
        });
        await question
          .save()
          .then((doc) => {
            return doc;
          })
          .catch(function(err) {
            console.log(err);
          });
        res.send(question);
      }
    } catch (error) {
      res.status(400).json({ message: "Ошибка при добавлении вопроса" });
    }
  }
);

// router.post("/questions/photo/answers", async (req, res) => {
//   let form = new formidable.IncomingForm();

//   let upload = path.join(`${process.cwd()}`, "server", "uploads");
//   // console.log(upload);
//   if (!fs.existsSync(upload)) {
//     fs.mkdirSync(upload);
//   }

//   form.uploadDir = upload;
//   form.parse(req, async function(err, fields, files) {
//     const questionID = fields.questionID;
//     if (err) {
//       return next(err);
//     }
//     //нашел текущий вопрос, в котором буду менять пути для фоток ответов
//     const currentQuestion = await modelQUESTIONS.findOne({
//       questionID: questionID,
//     });
//     const answersInCurrentQuestion = currentQuestion.answers;

//     //пробегаюсь по файлам
//     for (fileID in files) {
//       let currentFile = files[fileID];
//       const date = Date.now();
//       date = String(date);
//       const fileName = path.join(upload, date, currentFile.name);

//       let dir;
//       fs.rename(currentFile.path, fileName, function(err) {
//         if (err) {
//           console.error(err.message);
//           return;
//         }

//         switch (platform) {
//           case "darwin":
//             dir = fileName.substr(fileName.indexOf("/"));
//             break;
//           case "win32":
//             dir = fileName.substr(fileName.indexOf("\\"));
//             break;
//           default:
//             dir = fileName.substr(fileName.indexOf("/"));
//         }
//         // console.log(dir);
//         dir = fileName.substr(fileName.indexOf("server/"));
//         // console.log(dir);
//       });
//       answersInCurrentQuestion.forEach((item) => {
//         // console.log(item.answer_id);
//         // console.log(fileID);
//         item.answer_id === +fileID
//           ? (item.imagePath = `server/uploads/${currentFile.name}`)
//           : "";
//       });
//     }

//     await modelQUESTIONS.findOneAndUpdate(
//       {
//         questionID: questionID,
//       },
//       { answers: answersInCurrentQuestion }
//     );
//     const updated = await modelQUESTIONS.findOne({
//       questionID: questionID,
//     });
//     console.log(updated);
//   });
// });

//изменение текущего вопроса
router.patch(
  "/questions/:id",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const currentQuestion = await modelQUESTIONS.findById(req.params.id);
      let questionPrev = currentQuestion.question;
      questionPrev.text = req.body.newQuestionTitle;
      questionPrev.img = req.body.img;
      await modelQUESTIONS.findByIdAndUpdate(req.params.id, {
        question: questionPrev,
      });
      res.json({
        message: "Изменение вопроса произошло успешно",
      });
    } catch (error) {
      res.status(400).json({ message: "Ошибка при изменении вопроса" });
    }
  }
);

//Удаление текущего вопроса
router.delete(
  "/questions/:id",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      await modelQUESTIONS.findByIdAndDelete(req.params.id);
      const questions = await modelQUESTIONS.find({});
      res.send(questions);
    } catch (error) {
      res.send({ status: error });
    }
  }
);

///ОТВЕТЫ В ВОПРОСЕ
//добавление ответа в текущий вопрос
router.patch(
  "/questions/answer/add/:id",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const currentQuestion = await modelQUESTIONS.findById(req.params.id);
    let answersPrev = currentQuestion.answers;
    answersPrev.push({
      text: req.body.answer.text,
      correct: req.body.answer.correct,
      imgURL: req.body.answer.imgURL,
      answer_id: req.body.answer.answer_id,
    });
    await modelQUESTIONS.findByIdAndUpdate(req.params.id, {
      answers: answersPrev,
    });
    // const currentQuestionUpdated = await modelQUESTIONS.findById(req.params.id);
    res.send(answersPrev);
  }
);

//изменение ответа в текущем вопросе
router.patch(
  "/questions/answer/:id",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const currentQuestion = await modelQUESTIONS.findById(req.params.id);
      let answersPrev = currentQuestion.answers;
      answersPrev = answersPrev.map((item) => {
        if (item.answer_id === req.body.answer_id) {
          item.text = req.body.text;
          item.imgURL = req.body.imgURL;
          return item;
        } else {
          return item;
        }
      });
      await modelQUESTIONS.findByIdAndUpdate(req.params.id, {
        answers: answersPrev,
      });
      // const currentQuestionUpdated = await modelQUESTIONS.findById(req.params.id);
      // res.send(currentQuestionUpdated);
      res.json({ message: "Ответ успешно изменен" });
    } catch (error) {
      res.status(400).json({
        message: "Произошла ошибка при изменении ответа",
      });
    }
  }
);

//изменения статуса ответа в текущем вопросе
router.patch(
  "/questions/answer/correct/:id",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const currentQuestion = await modelQUESTIONS.findById(req.params.id);
    let answersPrev = currentQuestion.answers;
    // console.log(req.body);
    answersPrev = answersPrev.map((item) => {
      // console.log(item);
      // console.log(newCorrectAnswer);
      switch (req.body.type) {
        case "oneAnswer":
          if (item.answer_id === req.body.answer_id) {
            item.correct = req.body.correct;
            return item;
          } else {
            item.correct = !req.body.correct;
            return item;
          }
          break;
        case "multipleAnswer":
          // console.log("multy");
          // console.log(newCorrectAnswer.text);
          // console.log(newCorrectAnswer.correct);
          if (item.answer_id === req.body.answer_id) {
            item.correct = req.body.correct;
            return item;
          } else {
            return item;
          }
          break;
      }
    });
    // console.log(answersPrev);
    await modelQUESTIONS.findByIdAndUpdate(req.params.id, {
      answers: answersPrev,
    });
    // const currentQuestionUpdated = await modelQUESTIONS.findById(req.params.id);
    res.send(answersPrev);
  }
);

//удаление ответа в текущем вопросе
router.patch(
  "/questions/answer/delete/:id",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const currentQuestion = await modelQUESTIONS.findById(req.params.id);
      let answersPrev = currentQuestion.answers;
      answersPrev = answersPrev.filter((answer) => {
        return answer.answer_id != req.body.answer_id ? answer : "";
      });
      await modelQUESTIONS.findByIdAndUpdate(req.params.id, {
        answers: answersPrev,
      });
      // const currentQuestionUpdated = await modelQUESTIONS.findById(req.params.id);
      // res.send(currentQuestionUpdated);
      res.json({ message: "удаление вопроса произошло успешно" });
    } catch (error) {
      res.status(400).json({
        message: "Произошла ошибка при удалении ответа",
      });
    }
  }
);

//изменения ключевых слов в ответе
router.patch(
  "/questions/answer/keywords/:id",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    // console.log(req.body);
    await modelQUESTIONS.findByIdAndUpdate(req.params.id, {
      keywordsArray: req.body.keywords,
    });
  }
);

//РЕЗУЛЬТАТЫ
//добавление нового результата
router.post("/results", async (req, res) => {
  // console.log(req.body);
  let isNewResult = await findPrevResult(req, res);
  // console.log(isNewResult);
  if (isNewResult) {
    const results = new modelRESULTS({
      fullName: req.body.fullName,
      group: req.body.group,
      mark: req.body.mark,
      test_id: req.body.test_id,
      test_level: req.body.test_level,
      test_name: req.body.test_name,
      group_id: req.body.group_id,
      student_id: req.body.student_id,
      creatorId: req.body.creatorId,
    });
    await results
      .save()
      .then((doc) => {
        return doc;
      })
      .catch(function(err) {
        console.log(err);
      });
    res.send(results);
  } else {
    changeResult(req, res);
  }
});
//измнение существующего результата
router.patch("/results/:id", async (req, res) => {
  // await modelRESULTS.findByIdAndUpdate(req.params.id, {
  //   mark: req.body.mark,
  //   test_level: req.body.test_level,
  // });
  // res.send(await modelRESULTS.findById(req.params.id));
  changeResult(req, res);
});
//получение всех результатов
router.get("/results/:creatorId", async (req, res) => {
  const allResults = await modelRESULTS.find({
    creatorId: req.params.creatorId,
  });
  res.send(allResults);
});

async function findPrevResult(req, res) {
  const student = await modelRESULTS.find({
    test_id: req.body.test_id,
    fullName: req.body.fullName,
  });
  let isNew = !!student.length;
  // console.log(isNew);
  return !isNew;
}

async function changeResult(req, res) {
  try {
    const student = await modelRESULTS.findOne({
      test_id: req.body.test_id,
      fullName: req.body.fullName,
    });
    // console.log(student);
    await modelRESULTS.findByIdAndUpdate(student._id, {
      mark: req.body.mark,
      test_level: req.body.test_level,
    });
    res.json({ message: "Резульатт прохождения теста успешно добавлен в БД" });
  } catch (error) {
    res.status(400).json({ message: error });
  }

  // res.send(await modelRESULTS.findById(req.params.id));
}

//ТЕСТЫ

//добавление теста
router.post(
  "/tests",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const test = new modelTESTS({
        id: req.body.id,
        level: req.body.level,
        name: req.body.name,
        group: req.body.group,
        group_id: req.body.group_id,
        access: req.body.access,
        time: req.body.time,
        creatorId: req.body.creatorId,
      });
      await test
        .save()
        .then((doc) => {
          return doc;
        })
        .catch((err) => console.log(err));
      res.send(test);
    } catch (error) {
      res
        .status(400)
        .json({ message: "Произошла ошибка при добавлении теста" });
    }
  }
);
//получение всех тестов
router.get("/tests/:creatorId", async (req, res) => {
  // console.log(req.params);
  try {
    const allTests = await modelTESTS.find({
      creatorId: `${req.params.creatorId}`,
    });
    res.send(allTests);
  } catch (error) {
    console.log(error);
  }
});
router.get("/tests/public/:creatorId", async (req, res) => {
  try {
    const publicTests = await modelTESTS.find({
      access: true,
      creatorId: req.params.creatorId,
    });
    console.log(publicTests);
    res.send(publicTests);
  } catch (error) {
    console.log(error);
  }
});
router.patch(
  "/tests/updateSettings",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    // console.log(req.body);
    try {
      await modelTESTS.findByIdAndUpdate(req.body._id, {
        access: req.body.access,
        time: req.body.time,
        name: req.body.name,
      });
      const resultsOfCurrentGroup = await modelRESULTS.find({
        group_id: req.body.group_id,
      });
      // console.log(resultsOfCurrentGroup);
      resultsOfCurrentGroup.forEach(async (result) => {
        await result.updateOne({ test_name: req.body.name });
      });
      // console.log(
      //   await modelRESULTS.find({
      //     group_id: req.body.group_id,
      //   })
      // );
      res.status(200).send({ message: "Обновление произошло успешно" });
    } catch (error) {
      res.status(400).json({ message: "Произошла ошибка при обновлении" });
    }
  }
);
//удаление текущего теста
router.delete(
  "/tests/:id",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      await modelTESTS.findByIdAndDelete(req.params.id);
      // const tests = await modelTESTS.find({});
      // res.status(200).send(tests);
      res.json({ message: "Удаление произошло успешно" });
    } catch (error) {
      res.status(400).send({ error: "Ошибка" });
    }
  }
);

//ПОЛЬЗОВАТЕЛИ

//регистрация пользователя
router.post("/register", async (req, res) => {
  console.log(req.body);
  const salt = bcrypt.genSaltSync(10);
  const password = req.body.password;

  try {
    const user = new modelUSER({
      login: req.body.login,
      password: bcrypt.hashSync(password, salt),
      name: req.body.name,
      surname: req.body.surname,
      subject: req.body.subject,
    });
    await user.save();
    const createdUser = await modelUSER.findOne({ login: req.body.login });
    const subject = new modelSUBJECTS({
      subjectName: req.body.subject,
      creatorId: createdUser._id,
    });
    await subject.save();
    res.send({
      type: "success",
      message: "user created",
      user: user,
    });
  } catch (error) {
    console.log(error);
  }
});
router.post("/login", async (req, res) => {
  const condidate = await modelUSER.findOne({ login: req.body.login });
  // console.log(condidate);
  if (condidate) {
    const passwordResult = bcrypt.compareSync(
      req.body.password,
      condidate.password
    );
    if (passwordResult) {
      const token = jwt.sign(
        {
          login: condidate.login,
          userId: condidate._id,
        },
        "devJWT",
        { expiresIn: "1h" }
      );
      res.send({
        token: `Bearer ${token}`,
        login: condidate.login,
        userId: condidate._id,
      });
    } else {
      res.status(401).json({
        message: "Пароль не верный",
      });
    }
  } else {
    res.send({
      type: "error",
      message: "Неверный логин",
      token: false,
    });
  }
});
router.post("/user", async (req, res) => {
  // console.log(req.body);
  try {
    let decoded = jwtDecode(req.headers.authorization);
    if (decoded.exp * 1000 < Date.now()) {
      res.status(400).json({
        message: "token просрочен",
      });
    }
    if (req.headers.authorization !== "null") {
      // console.log(req.headers.authorization);
      // console.log("Внутри когда есть header authorization");
      const user = await modelUSER.findOne({ login: req.body.login });
      // console.log(user);
      res.status(200).json({
        status: "success",
        user: user,
      });
    } else {
      res.status(401).json({
        message: "Не авторизирован",
      });
    }
  } catch (error) {
    res.status(401).json({
      message: "Не авторизирован",
    });
  }
});

router.post("/logout", async (req, res) => {
  // console.log(req.headers.authorization);
  res.status(200).json({
    data: "logout",
  });
});

//изменение логина и пароля
router.patch(
  "/user/edit/:id",
  // passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let form = new formidable.IncomingForm();
    // console.log(process.cwd());
    let upload = path.join(`${process.cwd()}`, "server", "uploads");
    // console.log(upload);
    if (!fs.existsSync(upload)) {
      fs.mkdirSync(upload);
    }

    // console.log(`dirname: ${__dirname}`);
    // console.log(`cwd: ${process.cwd()}`);

    form.uploadDir = upload;

    form.parse(req, async function(err, fields, files) {
      console.log(files);
      if (err) {
        return next(err);
      }

      const valid = validation(fields, files);

      if (valid.err) {
        fs.unlinkSync(files.photoUser.path);
        // return res.redirect(`/?msg=${valid.status}`);
      }

      const fileName = path.join(upload, files.photoUser.name);

      fs.rename(files.photoUser.path, fileName, async function(err) {
        let dir;
        if (err) {
          console.error(err.message);
          return;
        }

        switch (platform) {
          case "darwin":
            dir = fileName.substr(fileName.indexOf("/"));
            break;
          case "win32":
            dir = fileName.substr(fileName.indexOf("\\"));
            break;
          default:
            dir = fileName.substr(fileName.indexOf("/"));
        }
        // console.log(dir);
        // console.log(fileName);
        dir = fileName.substr(fileName.indexOf("server/"));
        const salt = bcrypt.genSaltSync(10);
        const password = fields.password;
        // console.log(req.body);
        const condidate = await modelUSER.findOne({ login: fields.login });
        const passwordResult = bcrypt.compareSync(
          fields.password,
          condidate.password
        );
        // console.log(passwordResult);
        if (!passwordResult) {
          try {
            await modelUSER.findByIdAndUpdate(
              req.params.id,
              {
                password: bcrypt.hashSync(password, salt),
                login: fields.login,
                photoUser: dir,
              },
              { new: true }
            );
            const user = await modelUSER.findById(req.params.id);
            // console.log(user);
            res.send({
              type: "success",
              message: "user created",
              user: user,
            });
          } catch (error) {
            console.log(error);
          }
        } else {
          res.status(400).send({
            message: "Новый пароль совпадает со старым",
          });
        }
      });
    });
  }
);
const validation = (fields, files) => {
  if (files.photoUser.name === "" || files.photoUser.size === 0) {
    return { status: "Не загружена картинка!", err: true };
  }
  return { status: "Ok", err: false };
};

//ПРОХОЖДЕНИЕ ТЕСТА
router.post("/passingTest/addUser", async (req, res) => {
  let isNew = await findPassingTestUser(req);
  if (isNew) {
    const user = new modelPASSING_TEST_USERS({
      fullName: req.body.fullName,
      student_id: req.body.student_id,
      group_id: req.body.group_id,
    });
    await user.save();
    res.json({
      user,
      message: "новый пользователь начал проходить тестирование",
    });
  } else {
    res.status(400).json({ message: "Этот студент уже проходит тестирование" });
  }
});

router.delete("/passingTest/deleteUser/:id", async (req, res) => {
  // console.log("delete passigntest user");
  // console.log(req.params.id);
  try {
    await modelPASSING_TEST_USERS.findByIdAndDelete(req.params.id);
    res.json({
      message:
        "пользователь успешно завершил тестирование и удален из БД тестирований",
    });
  } catch (error) {
    res.status(400).json({ message: error });
  }
});

async function findPassingTestUser(req) {
  const user = await modelPASSING_TEST_USERS.findOne({
    student_id: req.body.student_id,
    group_id: req.body.group_id,
  });
  // console.log(user);
  let isNew = !user;
  // console.log(isNew);
  return isNew;
}

//Получение всех предметов
router.get("/allSubjects", async (req, res) => {
  try {
    let subjects = await modelSUBJECTS.find({});
    res.send(subjects);
  } catch (e) {
    throw new Error("Ошибка при получении списка предметов");
  }
});

module.exports = router;

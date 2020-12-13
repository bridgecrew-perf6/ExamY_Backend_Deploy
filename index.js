// 백엔드의 시작점
const express = require('express') // express module 가져오기
const app = express() // 새로운 express 앱 생성
const port = process.env.PORT||5000

const multer = require('multer')
const path = require('path')

const bodyParser = require('body-parser') // body-parser 가져오기 
const cookieParser = require('cookie-parser')
const { User } = require("./models/User") // User Model 가져오기
const {QuestionList} = require("./models/QuestionList");
const {ExamList} = require("./models/ExamList");

const config = require('./config/key');
const {auth} = require('./middleware/auth')

app.set('trust proxy'); // optional, not needed for secure cookies
// app.use(express.session({
//     secret : 'somesecret',
//     key : 'sid',
//     proxy : true, // add this when behind a reverse proxy, if you need secure cookies
//     cookie : {
//         secure : true,
//         maxAge: 5184000000 // 2 months
//     }
// }));

const cors = require('cors')

app.use(cors())
app.use(bodyParser.urlencoded({extended: true})) 
app.use(bodyParser.json()) 
app.use(cookieParser());

app.use('/static', express.static(__dirname + '/public'));
const mongoose = require('mongoose') // mongoose 가져오기
mongoose.connect(config.mongoURI, 
{useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false})
.then(() => console.log('Mongo DB Connected'))
.catch((err) => console.log(err)) // mongoose를 통해 mongo DB connect 및 연결 확인 및 error 처리


//root directory Hello World! print
app.get('/', (req, res) => {
  res.send('Hello World')
})


// post를 보내준다.
app.post('/api/users/register', (req, res) => {

  // 회원 가입 할 때 필요한 정보들을 client에서 가져오면
  // 그것들을 데이터 베이스에 넣어준다.  

  const user = new User(req.body)

  user.save((err, userInfo) => {
    if(err) return res.json({success: false, err})
    return res.status(200).json({
      success: true
    })
  })

})

// question upload 하기
app.post('/api/test/UploadQuestion', (req, res) => {
  const Question = new QuestionList(req.body)
  Question.save((err, QuestionInfo) =>{
    if(err) return res.json({success: false, err})
    return res.status(200).json({
      success: true
    })
  })
 
})

// Exam 만들기
app.post('/api/test/maketest', (req, res) => {

  const Exam = new ExamList(req.body)

  Exam.save((err, ExamInfo) => {
    if(err) return res.json({success: false, err})
    return res.status(200).json({
      success: true
    })
  })
})

// ques
app.post('/api/room/fetchexam', (req, res) => {

  ExamList.findOne({ Exam_id: req.body.Exam_id }, (err, exam) => {

    if(!exam){
      return res.json({
        fetchSuccess: false,
        message: `${req.body.Exam_id} 에 입장할 수 없습니다.`
      })
    }
    else 
      return res.status(200).json({
      fetchSuccess : true,
      QuestionIdx : exam.Questions,
      Exam_code : exam.Exam_code
    })
  })
})

// ques
app.post('/api/room/fetchquestions', (req, res) => {
  
  QuestionList.findOne({ Question_id: req.body.Question_id }, (err, questions) => {
    if(!questions){
      return res.json({
        fetchSuccess: false,
        // message: `${req.Question_id}를 가져올 수 없습니다.`
      })
    }
    else 
      return res.status(200).json({
      fetchSuccess : true,
      QuestionInfo : questions
    })
  })
})

// 로그인 라우터
app.post('/api/users/login', (req, res) => {

  // 1. 요청된 이메일을 데이터베이스에 있는지 찾는다.
  User.findOne({ email: req.body.email }, (err, user) => {
    if(!user){
      return res.json({
        loginSuccess: false,
        message: "제공된 이메일에 해당하는 유저가 없습니다."
      })
    }
    // 2. 요청된 이메일이 DB에 있다면 비밀번호가 맞는지 확인한다.
    user.comparePassword(req.body.password, (err, isMatch) =>{
      if(!isMatch)
        return res.json({ loginSuccess: false, message: "비밀번호가 틀렸습니다."})
        // 3. 비밀번호까지 맞다면 토큰을 생성한다.
      user.generateToken((err, user) =>{
        if(err) return res.status(400).senc(err);

        // 토큰을 (쿠키, 로컬스토리지 등) 에 저장한다.
        // res.cookie("x_auth", user.token)
        res.status(200)
        .json({loginSuccess: true, userId : user._id, "token": user.token})
      })
    })
  })
})

app.post('/api/users/auth', auth, (req, res) =>{
  // 여기 까지 미들웨어를 통과해 왔다는 얘기는 Authentication이 True라는 말.
  res.status(200).json({
    _id: req.user._id,
    isAdmin: req.user.role === 0 ? false : true,
    isAuth: true,
    email: req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
    image: req.user.image
  })
})

// 로그 아웃
app.post('/api/users/logout', auth, (req, res) => {
  User.findOneAndUpdate({_id: req.user._id},
    {token: ""}, (err, user) =>{
      if(err) return res.json({success: false, err})
      return res.status(200).send({
        success: true
      })
    })
})

app.listen(port, () => {
  console.log(`Example app listening at ${port}`)
})
require('dotenv').config()
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const nodemailer = require('nodemailer');
const { error } = require('console');
const { Server } = require('http');

const app = express();
app.use(express.json());
app.use(cors());




/*const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "storage",
});
*/
// const con = mysql.createConnection({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME
//   });
  const con = mysql.createConnection({
    host:"examdatabase.cluk60aaw3od.ap-south-1.rds.amazonaws.com",
    user: "admin",
    password:"examroot",
    database: "railwayexam",
  });

con.connect((err) => {
    if (err) {
        console.error("Error connecting to the database", err);
        return;
    }
    console.log("Connected to the database");
});

const transporter=nodemailer.createTransport({
    service:'gmail',
    
    auth:{
        user: `practicetest3333@gmail.com`,   // Use environment variable
        pass:`apnb nivv cgvi jonl`   
    }
})


let otpStorage = {};
let sendOtp=''

function anonymizeEmail(email){
    const[localpart,domain]=email.split('@');
    const maskedlocalpart=localpart.slice(0,2)+'***'+ localpart.slice(-1);;
    return maskedlocalpart+'@'+domain
}
{/* const finindingmailserver=(email)=>{
    const domain=email.split('@')[1]
    let trasnportconfig={}
    if(domain.includes('gmail.com')){
        trasnportconfig={
            Service:'gmail',
            auth:{
                user: `practicetest3333@gmail.com`,   // Use environment variable
                pass:`lipy rmae logq icjf` 
            }
        }

    }
    return nodemailer.createTransport(trasnportconfig)
}
    */}


// Endpoint to handle user registration
app.post('/register',  (req, res) => {
    const { username, email, usermobile, password } = req.body;

    const checkExistUser = "SELECT * FROM user WHERE user_mobileno=?";
    con.query(checkExistUser, [usermobile], (err, results) => {
        if (err) {
            console.error("Error checking the user:", err);
            return res.status(500).json({ message: "Failed to register user" });
        }
        if (results.length > 0) {
            return res.status(400).json({ message: "User with this mobile number already exists" });
        }

        const insertSql = "INSERT INTO user(user_name, user_email, user_password, user_mobileno) VALUES (?, ?, ?, ?)";
        con.query(insertSql, [username, email, password, usermobile], (err, result) => {
            if (err) {
                console.error("Error registering user:", err);
                return res.status(500).json({ message: "Failed to register user" });
            }
            console.log("User registered successfully");
            return res.status(200).json(result);
        });
    });
});

//login logic
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const query = "SELECT * FROM user WHERE user_name = ? AND user_password = ?";
    con.query(query, [username, password], (err, result) => {
        if (err) {
            console.error("Error logging in user:", err);
            return res.status(500).json({ message: "Failed to login" });
        }

        if (result.length === 0) { 
            return res.status(400).json({ message: "Invalid credentials" });
        }

        //console.log("User logged in successfully");
        //return res.status(200).json(result);
        const user=result[0];
        const otp=Math.floor(100000+Math.random()*900000)
        const otpEmail=user.user_email;

        otpStorage[username] = otp; 
       // const transporter =finindingmailserver(otpEmail)

        const mailoptions={
            from: `practicetest3333@gmail.com `,  
            to:otpEmail,
            subject:'your otp code',
            text:`your otp code is:${otp}`
        }

        

        transporter.sendMail(mailoptions,(error,info)=>{
            if(error){
                console.log(`error sending email:`,error);
                return res.status(500).json({message:'error sending otp'})
            }

            const anonymizedEmail = anonymizeEmail(otpEmail);
            res.status(200).json({
                message: 'OTP sent to your email.',
                otpEmail: anonymizedEmail,
               
            });
        })

    });
});

app.post(`/verify_otp`, (req, res) => {
    const { username, otp } = req.body;

    // Check if OTP exists in memory and validate
    if (otpStorage[username] === parseInt(otp)) {
        delete otpStorage[username];  // Clear OTP after successful verification
        res.status(200).json({ message: 'Login successful!' });
    } else {
        res.status(400).json({ message: 'Invalid OTP' });
    }
});
//evalutordetails
app.post('/evalsubmit', (req, res) => {
    const { username, password, email, phone, subjectname } = req.body;

    const sql = "INSERT INTO evaluator (evaluator_name, evaluator_email, evaluator_phonenumber, evaluator_subject, evaluator_password) VALUES (?, ?, ?, ?, ?)";
    con.query(sql, [username, email, phone, subjectname, password], (err, results) => {
        if (err) {
            console.error("Error uploading evaluator details:", err);
            return res.status(500).json({ message: "Error uploading evaluator details" });
        }
        console.log("Successfully uploaded evaluator details");
        return res.status(200).json(results);
    });
});

app.post('/evaluatorlogin', (req, res) => {
    const { username, password } = req.body;

    // Query to find the evaluator
    const query = 'SELECT * FROM evaluator WHERE evaluator_name = ? AND evaluator_password = ?';
    
    con.query(query, [username, password], (error, results) => {
        if (error) {
            return res.status(500).send({ message: "Server error" });
        }

        if (results.length > 0) {
            const evaluator = results[0];
            // Return evaluator_id and evaluator_name to the client
            res.status(200).send({
                evaluator_id: evaluator.evaluator_id,
                evaluator_name: evaluator.evaluator_name
            });
        } else {
            res.status(401).send({ message: "Invalid credentials" });
        }
    });
});


app.get('/evaluatordetails',(req,res)=>{
    const sql="select * from evaluator";
    con.query(sql,(err,results)=>{
        if(err){
            console.error("while getting evaluator details error ocured",err)
            return res.status(500).json({message:"while getting evaluator details error occured"})
        }
        console.log("sucessfully getting evaluator details")
        return res.status(200).json(results)
    })
})

app.delete('/evaluatordelete/:evaluatorId', (req, res) => {
    const evaluatorid = req.params.evaluatorId;
    const sql = "DELETE FROM evaluator WHERE evaluator_id = ?";
    
    con.query(sql, [evaluatorid], (err, results) => {
        if (err) {
            console.log("Error occurred while deleting the evaluator record:", err);
            return res.status(500).json({ message: "Error occurred while deleting the evaluator record" });
        }
        console.log("Successfully deleted the evaluator record");
        return res.status(200).json(results);
    });
});

app.put('/editevaluator/:evaluatorid',(req,res)=>{
    const evaluatorId=req.params.evaluatorid;
    const{evaluator_name,evaluator_phonenumber,evaluator_email}=req.body
    const sql=`update evaluator set evaluator_name= ?,evaluator_email=?,evaluator_phonenumber=? where evaluator_id=?`
    con.query(sql,[evaluator_name,evaluator_email,evaluator_phonenumber,evaluatorId],(err,results)=>{
        if(err){
            console.error("error ocured while editing the evaluator details",err)
            return res.status(500).json({message:"error occured"})
        }
        console.log("sucessfully edit the record")
        return res.status(200).json(results)
    })
    
})



// Endpoint to fetch all admin details
app.get('/admindetails', (req, res) => {
    const sql = "SELECT * FROM user";
    con.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching admin details", err);
            return res.status(500).json({ message: "Failed to fetch admin details" });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: "No admin details found" });
        }
        console.log("Successfully fetched admin details");
        return res.status(200).json(result);
    });
});

// Endpoint to delete a user by user_id
app.delete('/deleteuser/:userId', (req, res) => {
    const userId = req.params.userId;
    const delSql = 'DELETE FROM user WHERE user_id=?';
    con.query(delSql, [userId], (err, result) => {
        if (err) {
            console.error("Error deleting user:", err);
            return res.status(500).json({ message: "Failed to delete user" });
        }
        console.log("User deleted successfully");
        return res.status(200).json(result);
    });
});

// Endpoint to update user details
app.put('/edituser/:userId', (req, res) => {
    const userId = req.params.userId;
    const { user_name, user_password, user_email, user_mobileno } = req.body;

    // Check if the new email or mobile number already exists
    const checkDuplicate = `SELECT * FROM user WHERE (user_email=? OR user_mobileno=?) AND user_id <> ?`;
    con.query(checkDuplicate, [user_email, user_mobileno, userId], (err, results) => {
        if (err) {
            console.error("Error checking duplicates:", err);
            return res.status(500).json({ message: "Failed to update user" });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: "Duplicate email or mobile number found" });
        }

        // Update user details
        const updateSql = `UPDATE user SET user_name=?, user_password=?, user_email=?, user_mobileno=? WHERE user_id=?`;
        con.query(updateSql, [user_name, user_password, user_email, user_mobileno, userId], (err, result) => {
            if (err) {
                console.error("Error updating user:", err);
                return res.status(500).json({ message: "Failed to update user" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "User not found for update" });
            }

            console.log("User updated successfully");
            return res.status(200).json(result);
        });
    });
});

// Multer configuration for file upload
/*const storage = multer.diskStorage({
    destination: 'uploads/',  // File upload location
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));  // File name
    }
});
*/
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        cb(null, `${timestamp}-${randomString}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// Student registration
app.post('/studentregister', upload.single("student_image"), (req, res) => {
    const { studentname, password, email, birthdate, phone } = req.body;
    const student_image = req.file ? req.file.filename : null;

    const checkExistUser = "SELECT * FROM student1 WHERE phone_number=?";
    con.query(checkExistUser, [phone], (err, result) => {
        if (err) {
            console.error("Error checking the student:", err);
            return res.status(500).json({ message: "Failed to register student" });
        }
        if (result.length > 0) {
            return res.status(400).json({ message: "Student with this phone number is already registered" });
        }

        const insertSql = "INSERT INTO student1 (student_name, email, phone_number, date_of_birth, password, student_image) VALUES (?, ?, ?, ?, ?, ?)";
        con.query(insertSql, [studentname, email, phone, birthdate, password, student_image], (err, result) => {
            if (err) {
                console.error("Error registering student:", err);
                return res.status(500).json({ message: "Failed to register student" });
            }
            console.log("Student registered successfully");
            return res.status(200).json({ message: "Student registered successfully", studentId: result.insertId });
        });
    });
});
//student login

app.post('/studentlogin',(req,res)=>{
    const{username,password}=req.body
    const query = 'SELECT student_id, student_name, email, phone_number, date_of_birth, student_image FROM student1 WHERE STUDENT_NAME = ? AND password = ?';
    con.query(query,[username,password],(err,result)=>{
        if(err){
            console.error('error student login:',err);
            return res.status(500).json({message:"failed to login"});
            
        }
        if(result.length ===0){
            return res.status(400).json({message:"invalid credentails"})
        }else{
            console.log("user logged in successfully");
            res.status(200).send(result[0]);

        }
        
    })
})



// Endpoint to fetch all student details
app.get('/studentdetails', (req, res) => {
    const sql = "SELECT * FROM student1";
    con.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching student details", err);
            return res.status(500).json({ message: "Failed to fetch student details" });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: "No student details found" });
        }
        console.log("Successfully fetched student details");
        return res.status(200).json(result);
    });
});

app.get('/studentdetail/:studentId', (req, res) => {
    const student_id = req.params.studentId;
    const sql = "SELECT * FROM student1 WHERE student_id = ?";
    
    con.query(sql, [student_id], (err, result) => {
        if (err) {
            console.error("Error collecting student details:", err);
            return res.status(500).json({ message: "Error collecting student details" });
        }
        console.log("Successfully collected student details");
        return res.status(200).json(result);
    });
});


// Endpoint to delete a student by student_id
app.delete('/deletestudent/:student_id', (req, res) => {
    const student_id = req.params.student_id;
    const delsql = "DELETE FROM student1 WHERE student_id=?";
    con.query(delsql, [student_id], (err, result) => {
        if (err) {
            console.error("Error deleting student:", err);
            return res.status(500).json({ message: "Failed to delete student" });
        }
        console.log("Student deleted successfully");
        return res.status(200).json(result);
    });
});

// Endpoint to update student details
app.put('/editstudent/:student_id', upload.single("student_image"), (req, res) => {
    const student_id = req.params.student_id;
    const { studentname, password, email, birthdate, phone } = req.body;
    const student_image = req.file ? req.file.filename : null;

    // Check if the new email or mobile number already exists
    const checkDuplicate = `SELECT * FROM student1 WHERE (email=? OR phone_number=?) AND student_id <> ?`;
    con.query(checkDuplicate, [email, phone, student_id], (err, results) => {
        if (err) {
            console.error("Error checking duplicates:", err);
            return res.status(500).json({ message: "Failed to update student" });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: "Duplicate email or phone number found" });
        }

        // Update student details
        let updateSql = `UPDATE student1 SET student_name=?, password=?, email=?, phone_number=?, date_of_birth=?`;
        const updateValues = [studentname, password, email, phone, birthdate];

        if (student_image) {
            updateSql += `, student_image=?`;
            updateValues.push(student_image);
        }

        updateSql += ` WHERE student_id=?`;
        updateValues.push(student_id);

        con.query(updateSql, updateValues, (err, result) => {
            if (err) {
                console.error("Error updating student:", err);
                return res.status(500).json({ message: "Failed to update student" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Student not found for update" });
            }

            console.log("Student updated successfully");
            return res.status(200).json(result);
        });
    });
});





//subject
// Endpoint to fetch all subjects
app.get('/subjects', (req, res) => {
    const sql = "SELECT * FROM subject";
    con.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching subjects", err);
            return res.status(500).json({ message: "Failed to fetch subjects" });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: "No subjects found" });
        }
        console.log("Successfully fetched subjects");
        return res.status(200).json(result);
    });
});

app.get('/getinparticularsubject/:selectedsubject',(req,res)=>{
const subjectId=req.params.selectedsubject
const sql="select * from subject where subject_id=?";
con.query(sql,[subjectId],(err,results)=>{
    if(err){
        console.error("errror getting the data of particular subject",err)
        return res.status(500).json({message:"errror while getting particular subject"})
    }
    console.log("sucessfully getting the particular subject")
    return res.status(200).json(results)
})
})

// Endpoint to add a new subject
app.post('/addsubject', (req, res) => {
    const { subject_name } = req.body;

    if (!subject_name) {
        return res.status(400).json({ message: "Subject name is required" });
    }

    const insertSql = "INSERT INTO subject (subject_name) VALUES (?)";
    con.query(insertSql, [subject_name], (err, result) => {
        if (err) {
            console.error("Error adding subject:", err);
            return res.status(500).json({ message: "Failed to add subject" });
        }
        console.log("Subject added successfully");
        return res.status(201).json({ message: "Subject added successfully", subjectId: result.insertId });
    });
});

// Endpoint to delete a subject by subject_id
app.delete('/deletesubject/:subjectId', (req, res) => {
    const subjectId = req.params.subjectId;
    const delSql = 'DELETE FROM subject WHERE subject_id=?';
    con.query(delSql, [subjectId], (err, result) => {
        if (err) {
            console.error("Error deleting subject:", err);
            return res.status(500).json({ message: "Failed to delete subject" });
        }
        console.log("Subject deleted successfully");
        return res.status(200).json({ message: "Subject deleted successfully" });
    });
});

// Endpoint to update a subject by subject_id
app.put('/editsubject/:subjectId', (req, res) => {
    const subjectId = req.params.subjectId;
    const { subject_name } = req.body;

    if (!subject_name) {
        return res.status(400).json({ message: "Subject name is required" });
    }

    const updateSql = "UPDATE subject SET subject_name=? WHERE subject_id=?";
    con.query(updateSql, [subject_name, subjectId], (err, result) => {
        if (err) {
            console.error("Error updating subject:", err);
            return res.status(500).json({ message: "Failed to update subject" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Subject not found for update" });
        }
        console.log("Subject updated successfully");
        return res.status(200).json({ message: "Subject updated successfully" });
    });
});



// QUESTIONS LOGIC
/*app.post("/add-question", (req, res) => {
    const {
        subject,
        ques_text,
        ques_text_image_data,
        Qa_text,
        Qa_image_data,
        Qb_text,
        Qb_image_data,
        Qc_text,
        Qc_image_data,
        Qd_text,
        Qd_image_data,
        Cans
    } = req.body;

    const query = `
        INSERT INTO questions (
            subject_id, ques_text, ques_text_image_data,
            Qa_text, Qa_image_data,
            Qb_text, Qb_image_data,
            Qc_text, Qc_image_data,
            Qd_text, Qd_image_data,
            Cans
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        subject,
        ques_text,
        ques_text_image_data || null,
        Qa_text,
        Qa_image_data || null,
        Qb_text,
        Qb_image_data || null,
        Qc_text,
        Qc_image_data || null,
        Qd_text,
        Qd_image_data || null,
        Cans
    ];

    con.query(query, values, (err, result) => {
        if (err) {
            console.error("Error inserting data:", err);
            res.status(500).send("Error inserting data");
        } else {
            res.status(200).send("Question added successfully");
        }
    });
});
*/

app.get(`/questionstype`,(req,res)=>{
    
    const sqlquery="select * from question_type1"
    con.query(sqlquery,(err,results)=>{
        if(err){
            console.error("fetching the question_type occured error",err)
            return res.status(500).json({message:"fetching the questions_types error occured"})
        }
        console.log("sucessfully getting question_types",results)
        return res.status(200).json(results)
    })
})

const multiUpload = upload.fields([
    { name: 'ques_text_image', maxCount: 1 },
    { name: 'Qa_image', maxCount: 1 },
    { name: 'Qb_image', maxCount: 1 },
    { name: 'Qc_image', maxCount: 1 },
    { name: 'Qd_image', maxCount: 1 }
]);

app.post('/add-question', multiUpload, (req, res) => {
    const {
        subject,
        questiontype,
        ques_text,
        Qa_text,
        Qb_text,
        Qc_text,
        Qd_text,
        Cans
    } = req.body;

    const ques_text_image_data = req.files['ques_text_image'] ? req.files['ques_text_image'][0].filename : null;
    const Qa_image_data = req.files['Qa_image'] ? req.files['Qa_image'][0].filename : null;
    const Qb_image_data = req.files['Qb_image'] ? req.files['Qb_image'][0].filename : null;
    const Qc_image_data = req.files['Qc_image'] ? req.files['Qc_image'][0].filename : null;
    const Qd_image_data = req.files['Qd_image'] ? req.files['Qd_image'][0].filename : null;

    console.log('ques_text_image_data:', ques_text_image_data);
    console.log('Qa_image_data:', Qa_image_data);
    console.log('Qb_image_data:', Qb_image_data);
    console.log('Qc_image_data:', Qc_image_data);
    console.log('Qd_image_data:', Qd_image_data);

    const query = `
        INSERT INTO questions (
            subject_id, ques_text, ques_text_image_data,
            Qa_text, Qa_image_data,
            Qb_text, Qb_image_data,
            Qc_text, Qc_image_data,
            Qd_text, Qd_image_data,
            Cans,qtype_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
    `;
    const values = [
        subject || null,
        ques_text || null,
        ques_text_image_data,
        Qa_text || null,
        Qa_image_data,
        Qb_text || null,
        Qb_image_data,
        Qc_text || null,
        Qc_image_data,
        Qd_text || null,
        Qd_image_data,
        Cans || null,
        questiontype||null
    ];

    con.query(query, values, (err, result) => {
        if (err) {
            console.error("Error adding question:", err);
            return res.status(500).json({ message: "Failed to add question" });
        }
        console.log("Question added successfully");
        return res.status(200).json({ message: "Question added successfully", questionId: result.insertId });
    });
});


app.get('/getquestion', (req, res) => {
    const query = `
        SELECT 
            question_id,
            subject_id,
            ques_text,
            ques_text_image_data,
            Qa_text,
            Qa_image_data,
            Qb_text,
            Qb_image_data,
            Qc_text,
            Qc_image_data,
            Qd_text,
            Qd_image_data,
            Cans
        FROM questions
    `;
    
    con.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching questions:', err);
            return res.status(500).json({ message: 'Failed to fetch questions' });
        }
        console.log('Questions fetched successfully');
        return res.status(200).json(results);
    });
});
app.get('/getquestions', (req, res) => {
    const { subjectId } = req.query;

    if (!subjectId) {
        return res.status(400).json({ error: "Subject ID is required" });
    }

    const query = 'SELECT * FROM questions WHERE subject_id = ?';
    con.query(query, [subjectId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Failed to fetch questions" });
        }

        res.json(results);
    });
});


const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

//saving result
app.post('/saveExamResults', (req, res) => {
    const {
        studentName,
        mobilenumber,
        studentId,
        subjectName,
        attemptedDescriptiveQuestions,
        attemptedCount,
        unattemptedQuestions,
        correctAnswersCount,
        wrongAnswersCount,
        totalMarks,
        startTime,
        endTime,
        Task_Id,
        examname,descriptivemarks,totalQuestions,reviewquestion,unreviewquestion
    } = req.body;

    
    console.log('Parsed Correct Answers Count:',correctAnswersCount);
    console.log('Parsed Wrong Answers Count:', wrongAnswersCount);
    console.log('Parsed Total Marks:', totalMarks);
    const formattedStartTime = formatDate(startTime);
    const formattedEndTime = formatDate(endTime);


    const query = `
        INSERT INTO exam_results 
            (studentName, studentMobileNo, studentId, subject, Attempted, UnAttempted, CorrectAnswered, WrongAnswered, TotalMarks, Examstarttime, Examendtime, attempted_descriptive_questions,examname,Task_Id,descriptivequestiontotalmarks,reviewquestions,unreviewquestions,objectivetotalmarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,?)
        `;

    const values = [
        studentName,
        mobilenumber,
        studentId,
        subjectName,
        attemptedCount,
        unattemptedQuestions,
        correctAnswersCount,
        wrongAnswersCount,
        totalMarks,
        formattedStartTime,
        formattedEndTime,attemptedDescriptiveQuestions,examname,Task_Id,descriptivemarks,reviewquestion,unreviewquestion,totalQuestions
    ];
    console.log('Query:', query);
    console.log('Values:', values);

    con.query(query, values, (error, results) => {
        if (error) {
            console.error('Error saving exam results:', error);
            return res.status(500).json({ error: 'Error saving exam results' });
        }
        res.status(200).json({ message: 'Exam results saved successfully' });
    });
});
// Endpoint to fetch exam results
{/* 
app.get('/examresults', (req, res) => {
    const sql = "SELECT * FROM exam_results";
    con.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching exam results", err);
            return res.status(500).json({ message: "Failed to fetch exam results" });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: "No exam results found" });
        }
        console.log("Successfully fetched exam results");
        return res.status(200).json(result);
    });
});
*/}

app.get('/examresults',(req,res)=>{
    const sql="select * from exam_results";
    con.query(sql,(err,results)=>{
        if(err){
            console.error("Error fethcing the exam results",err);
            return res.status(500).json({message:"failed to fetch exam results"});

        }
        if(results.length===0){
            return res.status(404).json({message:"no exam results found"})
        }
       
        const updated_data=results.map((item)=>({
            ...item,
            attempted_descriptive_questions:results.attempted_descriptive_questions ? JSON.parse(results.attempted_descriptive_questions):[]


        } ))
        console.log("sucesfully fetched exma results");
        return res.status(200).json(updated_data);
    })
})

app.post('/startExam', (req, res) => {
    const { studentId, taskId } = req.body;

    // Check current status of the exam
    const checkStatusSql = 'SELECT status FROM EXAM WHERE student_id = ? AND task_id = ?';
    con.query(checkStatusSql, [studentId, taskId], (err, results) => {
        if (err) {
            console.error("Error checking exam status:", err);
            return res.status(500).json({ message: "Error checking exam status" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Exam not found" });
        }

        const currentStatus = results[0].status;
        if (currentStatus === 'attempted') {
            return res.status(400).json({ message: "You have already attempted this exam." });
        }

        // Update status to attempted
        const updateStatusSql = 'UPDATE EXAM SET status = ? WHERE student_id = ? AND task_id = ?';
        con.query(updateStatusSql, ['attempted', studentId, taskId], (err) => {
            if (err) {
                console.error("Error updating exam status:", err);
                return res.status(500).json({ message: "Error updating exam status" });
            }
            res.status(200).json({ message: "You can start the exam now." });
        });
    });
});


// TAsk
app.get(`/gettingcompulsoryquestion/:subjectid`,(req,res)=>{
    const Subject_Id=req.params.subjectid;
    const sqlquery="select * from dsquestion where qtype_id=4 and subject_id=?";
    con.query(sqlquery,[Subject_Id],(err,results)=>{
        if(err){
            console.error("error getting while fetching the compulsory questions",err)
        }
        return res.status(200).json(results)
    })
})
app.get(`/gettingeasyquestion/:subjectid`,(req,res)=>{
    const Subject_Id=req.params.subjectid;
    const sqlquery="select * from dsquestion where qtype_id=1 and subject_id=?"
    con.query(sqlquery,[Subject_Id],(err,results)=>{
        if(err){
            console.error("error getting while fetching the easy questions",err)
        }
        return res.status(200).json(results)
    })
})

app.get(`/gettingmediumquestion/:subjectid`,(req,res)=>{
    const Subject_Id=req.params.subjectid;
    const sqlquery='select * from dsquestion where qtype_id=2 and subject_id=?'
    con.query(sqlquery,[Subject_Id],(err,results)=>{
        if(err){
            console.error("error getting while fetching the easy questions",err)
            return res.status(500).json({message:"error while getting the medium questions"})
        }
        console.log(results)
        return res.status(200).json(results)
    })
})

app.get(`/gettinghighquestion/:subjectid`,(req,res)=>{
    const Subject_Id=req.params.subjectid;
    const sqlquery='select * from dsquestion where qtype_id=3 and subject_id=?'
    con.query(sqlquery,[Subject_Id],(err,results)=>{
        if(err){
            console.error("error getting while fetching the easy questions",err)
            return res.status(500).json({message:"error while getting the medium questions"})
        }
        console.log(results)
        return res.status(200).json(results)
    })
})

app.get(`/gettingmcqcompulsryquestion/:subjectid`,(req,res)=>{
    const Subject_Id=req.params.subjectid;
    const sqlquery=`select * from questions where qtype_id=4 and subject_id=?`
    con.query(sqlquery,[Subject_Id],(err,results)=>{
        if(err){
            console.error("error getting while fetching the mcqcompulsoryquestions",err)
            return res.status(500).json({message :"error getting while fetching the compulsoryquestions"})
        }
        console.log(results,"mcqhiii1")
        return res.status(200).json(results)
    })
})

app.get(`/gettingmcqeasyquestion/:subjectid`,(req,res)=>{
    const Subject_Id=req.params.subjectid;
    const sqlquery=`select * from questions where qtype_id=1 and subject_id=?`
    con.query(sqlquery,[Subject_Id],(err,results)=>{
        if(err){
            console.error("error getting while fetching the gettingmcqeasyquestion",err)
            return res.status(500).json({message :"error getting while fetching the gettingmcqeasyquestion"})
        }
        return res.status(200).json(results)
    })
})

app.get(`/gettingmcqmediumquestion/:subjectid`,(req,res)=>{
    const Subject_Id=req.params.subjectid;
    const sqlquery=`select * from questions where qtype_id=2 and subject_id=?`
    con.query(sqlquery,[Subject_Id],(err,results)=>{
        if(err){
            console.error("error getting while fetching the gettingmcqmediumquestion",err)
            return res.status(500).json({message :"error getting while fetching the gettingmcqmediumquestion"})
        }
        return res.status(200).json(results)
    })
})

app.get(`/gettingmcqhighquestion/:subjectid`,(req,res)=>{
    const Subject_Id=req.params.subjectid;
    const sqlquery=`select * from questions where qtype_id=3 and subject_id=?`
    con.query(sqlquery,[Subject_Id],(err,results)=>{
        if(err){
            console.error("error getting while fetching the gettingmcqhighquestion",err)
            return res.status(500).json({message :"error getting while fetching the gettingmcqhighquestion"})
        }
        return res.status(200).json(results)
    })
})




app.get('/getquestionc', (req, res) => {
    const subjectId = req.query.subject_id;
    const query = 'SELECT * FROM questions WHERE subject_id = ?';

    con.query(query, [subjectId], (error, results) => {
        if (error) {
            return res.status(500).send('Error fetching questions');
        }
        res.json(results);
    });
});

app.post('/assignTask', (req, res) => {
    const { student_id, subject_id, question_count,dsquestion_count, starttime, endtime } = req.body;

    const sqlInsert = "INSERT INTO Atask1 (student_id, subject_id, question_count,dsquestion_count, exam_start_time, exam_end_time) VALUES (?, ?, ?, ?, ?,?)";
    con.query(sqlInsert, [student_id, subject_id, question_count,dsquestion_count, starttime, endtime], (err, result) => {
        if (err) {
            console.error("Error fetching exam results", err);
            return res.status(500).json({ message: "Failed to assigned task" });
        }
        
        console.log("Successfully fetched assigned task");
        return res.status(200).json(result);
    });
    
});

app.get('/getAssignedTasks', (req, res) => {
    const student_id = req.query.student_id;

    const sqlSelect = "SELECT * FROM Atask1 WHERE student_id = ?";
    con.query(sqlSelect, [student_id], (err, result) => {
        if (err) {
            console.error("Error  exam assigned task results", err);
            return res.status(500).json({ message: "Failed to fetch task results" });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: "No assigned task  found" });
        }
        console.log("Successfully fetched assigned task");
        return res.status(200).json(result);
    });
});
app.get('/studentdetail', (req, res) => {
    const student_id = req.query.student_id;

    const sqlSelect = "SELECT * FROM student1 WHERE student_id = ?";
    con.query(sqlSelect, [student_id], (err, result) => {
        if (err) {
            console.error("Error  exam assigned task results", err);
            return res.status(500).json({ message: "Failed to fetch task results" });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: "No assigned task  found" });
        }
        console.log("Successfully fetched assigned task");
        return res.status(200).json(result);
    });
});
app.get('/getSubjectName', (req, res) => {
    const subjectId = req.query.subject_id;
    const sql = `SELECT subject_name FROM subject WHERE subject_id = ?`;
    con.query(sql, [subjectId], (err, result) => {
        if (err) {
            res.send({ error: err });
        } else {
            res.send(result);
        }
    });
});

app.post('/dsquestions',(req,res)=>{
    const{subject_id,questiontext,marks,question_type}=req.body;
    const sql="insert into dsquestion(dsquestion,subject_id,marks,qtype_id) values(?,?,?,?)";
    con.query(sql,[questiontext,subject_id,marks,question_type],(err,result)=>{
        if(err){
            console.error("Error storeing dsquestion",err);
            return res.status(500).json({message:"failed toadding the ds question"})

        }else{
            console.log("sucessfully added data in ds")
            return res.status(200).json(result)
        }
    })
})
app.get("/subjectquestions/:subjectId", (req, res) => {
    const subjectId = req.params.subjectId;
    const sql = `SELECT * FROM questions WHERE subject_id = ?`;
    con.query(sql, [subjectId], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(result);
    });
});
app.put('/editquestion/:id', upload.fields([
    { name: 'ques_text_image', maxCount: 1 },
    { name: 'Qa_image', maxCount: 1 },
    { name: 'Qb_image', maxCount: 1 },
    { name: 'Qc_image', maxCount: 1 },
    { name: 'Qd_image', maxCount: 1 },
]), (req, res) => {
    const { id } = req.params;
    const {
        ques_text,
        Qa_text,
        Qb_text,
        Qc_text,
        Qd_text,
        Cans
    } = req.body;

    let ques_text_image = null;
    let Qa_image = null;
    let Qb_image = null;
    let Qc_image = null;
    let Qd_image = null;

    if (req.files) {
        if (req.files['ques_text_image']) {
            ques_text_image = req.files['ques_text_image'][0].filename;
        }
        if (req.files['Qa_image']) {
            Qa_image = req.files['Qa_image'][0].filename;
        }
        if (req.files['Qb_image']) {
            Qb_image = req.files['Qb_image'][0].filename;
        }
        if (req.files['Qc_image']) {
            Qc_image = req.files['Qc_image'][0].filename;
        }
        if (req.files['Qd_image']) {
            Qd_image = req.files['Qd_image'][0].filename;
        }
    }

    const query = `
        UPDATE questions 
        SET ques_text = ?, 
            Qa_text = ?, 
            Qb_text = ?, 
            Qc_text = ?, 
            Qd_text = ?, 
            Cans = ?, 
            ques_text_image_data = COALESCE(?, ques_text_image_data), 
            Qa_image_data = COALESCE(?, Qa_image_data), 
            Qb_image_data = COALESCE(?, Qb_image_data), 
            Qc_image_data = COALESCE(?, Qc_image_data), 
            Qd_image_data = COALESCE(?, Qd_image_data)
        WHERE question_id = ?`;

    const values = [
        ques_text,
        Qa_text,
        Qb_text,
        Qc_text,
        Qd_text,
        Cans,
        ques_text_image,
        Qa_image,
        Qb_image,
        Qc_image,
        Qd_image,
        id
    ];

    con.query(query, values, (error, results) => {
        if (error) {
            console.error("Error updating question:", error);
            return res.status(500).json({ error: "Error updating question" });
        }
        res.json({ message: "Question updated successfully" });
    });
});

app.delete(`/deletequestion/:questionId`,(req,res)=>{
    const questionid=req.params.questionId;
    const query="delete from questions where question_id=?"
    con.query(query,[questionid] ,(err,result)=>{
        if(err){
            console.error("error occured while deleteing",err)
            return res.status(500).json({err:"error deleteing question"});
        }
        console.log("quesion deleted sucessfully")
        res.status(200).json(result)

    })
   
})

app.get(`/theoryquestions/:subjectid`,(req,res)=>{
    const subject_id=req.params.subjectid;
    const sql="select * from dsquestion where subject_id=?";
    con.query(sql,[subject_id],(err,result)=>{
        if(err){
            console.error("fetching theroy questions error",err);
            return res.status(500).json({err:"error fetcheing theory questions"})
        }
        console.log("sucessfully fetched theory questions")
        res.status(200).json(result);
    })
})

// Define the file upload middleware
const multiUploads = upload.fields([
    { name: 'ques_text_image', maxCount: 1 },
    { name: 'Qa_image', maxCount: 1 },
    { name: 'Qb_image', maxCount: 1 },
    { name: 'Qc_image', maxCount: 1 },
    { name: 'Qd_image', maxCount: 1 }
]);

app.post('/addquestion', multiUploads, (req, res) => {
    // Extract form fields and file information
    const {
        subject,
        ques_text,
        Qa_text,
        Qb_text,
        Qc_text,
        Qd_text,
        Cans
    } = req.body;

    // Extract filenames for uploaded files
    const ques_text_image_data = req.files['ques_text_image'] ? req.files['ques_text_image'][0].filename : null;
    const Qa_image_data = req.files['Qa_image'] ? req.files['Qa_image'][0].filename : null;
    const Qb_image_data = req.files['Qb_image'] ? req.files['Qb_image'][0].filename : null;
    const Qc_image_data = req.files['Qc_image'] ? req.files['Qc_image'][0].filename : null;
    const Qd_image_data = req.files['Qd_image'] ? req.files['Qd_image'][0].filename : null;

    // Log file information for debugging
    console.log('ques_text_image_data:', ques_text_image_data);
    console.log('Qa_image_data:', Qa_image_data);
    console.log('Qb_image_data:', Qb_image_data);
    console.log('Qc_image_data:', Qc_image_data);
    console.log('Qd_image_data:', Qd_image_data);

    // Prepare SQL query
    const query = `
        INSERT INTO questions (
            subject_id, ques_text, ques_text_image_data,
            Qa_text, Qa_image_data,
            Qb_text, Qb_image_data,
            Qc_text, Qc_image_data,
            Qd_text, Qd_image_data,
            Cans
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        subject || null,
        ques_text || null,
        ques_text_image_data,
        Qa_text || null,
        Qa_image_data,
        Qb_text || null,
        Qb_image_data,
        Qc_text || null,
        Qc_image_data,
        Qd_text || null,
        Qd_image_data,
        Cans || null
    ];

    // Execute SQL query
    con.query(query, values, (err, result) => {
        if (err) {
            console.error("Error adding question:", err);
            return res.status(500).json({ message: "Failed to add question" });
        }
        console.log("Question added successfully");
        return res.status(200).json({ message: "Question added successfully", questionId: result.insertId });
    });
});

app.put('/editdsques/:editdsquesId', (req, res) => {
    const editeddsquesid = req.params.editdsquesId;
    const { dsquestion } = req.body; // Extract dsquestion from request body
    const query = "UPDATE dsquestion SET dsquestion=? WHERE dsq_id=?";
    con.query(query, [dsquestion, editeddsquesid], (err, result) => {
        if (err) {
            console.log("Error updating the descriptive question:", err);
            return res.status(500).json({ message: "Failed to update the descriptive question" });
        }
        console.log("Descriptive question updated successfully");
        return res.status(200).json(result);
    });
});

app.delete('/deletedsquestion/:questionId', (req, res) => {
    const deletedsquestion = req.params.questionId;
    const sqlquery = "DELETE FROM dsquestion WHERE dsq_id = ?";
    
    con.query(sqlquery, [deletedsquestion], (err, result) => {
        if (err) {
            console.error("Error deleting descriptive question:", err);
            return res.status(500).json({ message: "Error deleting the descriptive question" });
        }

        console.log("Successfully deleted the descriptive question");
        return res.status(200).json({ message: "Descriptive question deleted successfully" });
    });
});

app.get('/getQuestionPaper/:taskid', (req, res) => {
    const taskId = req.params.taskid;

    // Query the database to get the filename of the PDF
    const sql = `SELECT genratedquestionpaper FROM Atask1 WHERE task_id = ?`;
    
    con.query(sql, [taskId], (err, results) => {
        if (err) {
            console.error("Error fetching task details:", err);
            return res.status(500).json({ message: 'Error fetching task details' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Get the filename from the database
        const filename = results[0].genratedquestionpaper;
        const filepath = `uploads/${filename}`;

        // Send the file as a response
        res.sendFile(filepath, { root: __dirname }, (err) => {
            if (err) {
                console.error("Error sending the file:", err);
                return res.status(500).json({ message: 'Error sending the file' });
            }
        });
    });
});

app.get('/studentanswersheetgetting/:taskid/:studentid', (req, res) => {
    const Task_id = req.params.taskid;
    const Student_id = req.params.studentid;

    const sql = 'SELECT stud_ques_paper FROM exam WHERE task_id=? AND student_id=?';

    con.query(sql, [Task_id, Student_id], (err, results) => {
        if (err) {
            console.error("Error occurred while executing the query", err);
            return res.status(500).json({ message: "Error occurred while getting the answer sheet" });
        }
        if (results.length === 0 || !results[0].stud_ques_paper) {
            return res.status(404).json({ message: "No records found" }); // No answer sheet found
        }
        const filename = results[0].stud_ques_paper;
        const filePath = `uploads/${filename}`;

        res.sendFile(filePath, { root: __dirname }, (err) => {
            if (err) {
                console.error("Error sending the file", err);
                return res.status(500).json({ message: "Error sending the file" });
            }
        });
    });
});

app.get(`/gettingdescriptivecorrectionanswersheet/:studentid/:examname`,(req,res)=>{

    const Student_id=req.params.studentid;
    const Exam_name=req.params.examname;

    const sql='select evaluatedpaper from evalassignstud where student_id =? and exam_name =?';

    con.query(sql,[Student_id,Exam_name],(err,results)=>{
        if(err){
            console.error("error occured while executing the query",err);
            return res.status(500).json({message:"error occured whie getting the answer sheet"})
        }
        if(results.length===0||!results[0].evaluatedpaper){
            return res.status(404).json({ message: "No records found" });
        }
        const filename=results[0].evaluatedpaper;
        const filepath=`uploads/${filename}`
        
        res.sendFile(filepath, { root: __dirname }, (err) => {
            if (err) {
                console.error("Error sending the file", err);
                return res.status(500).json({ message: "Error sending the file" });
            }
        });
    })
})




// POST route for uploading the answer sheet
app.post(`/studentanswersheet/:taskid/:studentid`, upload.single('Answerpaper'), (req, res) => {
    const Task_Id = req.params.taskid;  // Get Task_Id from URL params
    const Student_Id = req.params.studentid;  // Get Student_Id from URL params

    // Get the filename from the uploaded file
    const filename = req.file ? req.file.filename : null;
   

    if (!filename) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    // Step 1: Check if Task_Id and Student_Id exist in the database
    const checkSql = "SELECT * FROM exam WHERE task_id = ? AND student_id = ?";
    con.query(checkSql, [Task_Id, Student_Id], (err, results) => {
        if (err) {
            console.error("Error while checking the record:", err);
            return res.status(500).json({ message: "Error while checking the record" });
        }

        // Step 2: If no matching record is found, send a response saying record not found
        if (results.length === 0) {
            return res.status(404).json({ message: "No matching record found for the given Task_Id and Student_Id" });
        }

        // Step 3: If record exists, insert the answer paper (filename) into the exam table
        const sql = "UPDATE exam SET stud_ques_paper = ? WHERE task_id = ? AND student_id = ?";
        con.query(sql, [filename, Task_Id, Student_Id], (err, results) => {
            if (err) {
                console.error("Error while uploading the answer sheet:", err);
                return res.status(500).json({ message: "Error while uploading the answer sheet" });
            }

            // Step 4: Respond with success message
            console.log("Successfully uploaded the student answer sheet");
            return res.status(200).json({ message: "Successfully uploaded the answer sheet", results });
        });
    });
});

app.get(`/gettinganswerhseet/:taskid`, (req, res) => {
    const Task_id = req.params.taskid;
    const sqlquery = 'SELECT s.student_name, s.email, e.student_id, e.status, e.exam_id, e.stud_ques_paper FROM exam AS e JOIN student1 AS s ON e.student_id = s.student_id WHERE e.task_id = ?';

    con.query(sqlquery, [Task_id], (err, results) => {
        if (err) {
            console.error("Error while fetching the answer sheet", err);
            return res.status(500).json({ message: "Error occurred while fetching the answer sheet" });
        }
        if (results.length === 0) {
            return res.status(400).json({ message: "No records available" });
        }

        let attemptedemail = [];
        let unattemptedemail = [];
        let attemptedNames = [];
        let unattemptedNames = [];
        
        // Separate attempted and unattempted students
        for (let i = 0; i < results.length; i++) {
            if (results[i].status === "attempted") {
                attemptedemail.push(results[i].email);
                attemptedNames.push(results[i].student_name);
            } else {
                unattemptedemail.push(results[i].email);
                unattemptedNames.push(results[i].student_name);
            }
        }

        console.log(attemptedemail);
        console.log(unattemptedemail);
        console.log(attemptedNames);
        console.log(unattemptedNames);
         const filename = results[0].stud_ques_paper;
        

        const filePath = `uploads/${filename}`;
        // Send email to attempted students
     {/*   const mailOptionsForAttempted = {
            from: 'practicetest3333@gmail.com',
            to: attemptedemail.join(', '),  // Join emails with commas for multiple recipients
            subject: 'Exam Response Sheet',
            text: `Thank you for attending the exam. Please find your answer sheet attached.`,
            attachments: results.filter(result => attemptedemail.includes(result.email)).map(result => ({
                filename: 'answer_sheet.pdf',
                path:`uploads/${result.stud_ques_paper}` 
            }))
        };

        transporter.sendMail(mailOptionsForAttempted, (err, info) => {
            if (err) {
                console.error('Error while sending answer sheet to attempted students', err);
            } else {
                console.log('Answer sheet sent successfully to attempted students:', info.response);
            }
        });
        */} 
        // Validate if attemptedemail and results are properly populated
if (Array.isArray(attemptedemail) && attemptedemail.length > 0 && Array.isArray(results) && results.length > 0) {
    // Filter results for students who attempted the exam and have a valid answer sheet path
    const attachments = results.filter(result => attemptedemail.includes(result.email) && result.stud_ques_paper)
                                .map(result => ({
                                    filename: 'answer_sheet.pdf',
                                    path: `uploads/${result.stud_ques_paper}`  // Ensure the path is correct
                                }));

    // Check if there are any attachments to send
    if (attachments.length > 0) {
        const mailOptionsForAttempted = {
            from: 'practicetest3333@gmail.com',
            to: attemptedemail.join(', '),  // Join emails with commas for multiple recipients
            subject: 'Exam Response Sheet',
            text: 'Thank you for attending the exam. Please find your answer sheet attached.',
            attachments: attachments  // Only attach if there are valid attachments
        };

        transporter.sendMail(mailOptionsForAttempted, (err, info) => {
            if (err) {
                console.error('Error while sending answer sheet to attempted students', err);
            } else {
                console.log('Answer sheet sent successfully to attempted students:', info.response);
            }
        });
    } else {
        console.log('No valid attachments found for attempted students.');
    }
} else {
    console.error('Error: No attempted students or invalid results.');
}


        // Send email to unattempted students
      // Check if 'unattemptedemail' and 'unattemptedNames' are properly populated
if (Array.isArray(unattemptedemail) && unattemptedemail.length > 0) {
    // Join email addresses with a comma for the 'to' field
    const mailOptionsForUnattempted = {
        from: 'practicetest3333@gmail.com',
        to: unattemptedemail.join(', '),  // Ensure it's a comma-separated string of emails
        subject: 'You are absent for the exam',
        text: `Dear ${unattemptedNames.join(', ')}, you were absent for the exam. Please consult your Head of Department.`
    };

    transporter.sendMail(mailOptionsForUnattempted, (err, info) => {
        if (err) {
            console.error('Error while sending absence email to unattempted students', err);
        } else {
            console.log('Absence email sent successfully to unattempted students:', info.response);
        }
    });
} else {
    // Log error if no emails are found
    console.error('Error: No unattempted students or email addresses found!');
}

        // Return the response
        return res.status(200).json(results);
    });
});




app.post('/randomassignTask',upload.single('questionpaper'),(req,res)=>{
    const{subject_id,Examname,question_count,dsquestion_count,
        starttime,endtime,pmulquestion_count,
        pdsquestion_count,
        pmulquestion_id,
        pdsquestion_id,McqIds,DsqIds

    }=req.body;

   const duplicatesql = "select * from Atask1 where exa_name=?";
con.query(duplicatesql, [Examname], (err, result) => {
    if (err) {
        console.error("error occurred while getting the data", err);
        return res.status(500).json({ message: "Error occurred while checking for duplicates" });
    }
    if (result.length > 0) {
        console.log("Duplicate exam name found");
        return res.status(400).json({ message: "duplicate entry is available" });
    }
});

    
    console.log(req.file)
    const buffer=req.file.buffer
    console.log(buffer,"sucsssfully")
    const filename = req.file?req.file.filename:null  ; 
    console.log(filename, "thatfilename");
    const filepath=req.file?req.file.path:"null"
    console.log(filepath,"haaaaaaaaaaa")

    const originalname=req.file ?req.file.originalname:null;
    console.log(originalname,"heeeeeeeeeeeeeeee")

    const pdfUrl = filename ? `/uploads/${filename}` : null; // Use filename correctly
    console.log(pdfUrl, "hooooooooooooooo");
    const binarydata=req.file?req.file.buffer:"null"
    console.log(binarydata,"buffereeeeing")

    const sql=`insert into Atask1(exa_name,subject_id,question_count,dsquestion_count,
    exam_start_time,exam_end_time,pmulquestion_count,pdsquestion_count,
    pmulquestion_id,pdsquestion_id,genratedquestionpaper, mcq_question_id,dsq_question_id) values(?,?,?,?,?,?,?,?,?,?,?,?,?)`;

    const values=[Examname,subject_id,question_count,dsquestion_count,starttime,endtime,pmulquestion_count,pdsquestion_count,
        pmulquestion_id,
        pdsquestion_id,filename,McqIds,DsqIds]
    
    con.query(sql,values,(err,result)=>{
        if(err){
            console.error("error occured while storeing the task details",err)
            return res.status(500).json({message:"error storeing the task details"})
        }
        else{
            console.log("sucess assign the taskdetails")
            return res.status(200).json(result)
        }
    })

})

app.post('/assignTasks', (req, res) => {
    const {
        subject_id,
        Examname,
        question_count,
        dsquestion_count,
        exam_start_time,
        exam_end_time,
        pmulquestion_count,
        pdsquestion_count,
        pmulquestion_id,
        pdsquestion_id
    } = req.body;

    // Prepare SQL query
    const sql = `
        INSERT INTO Atask1(
            subject_id, 
            exa_name, 
            question_count, 
            dsquestion_count, 
            exam_start_time, 
            exam_end_time, 
            pmulquestion_count, 
            pdsquestion_count, 
            pmulquestion_id, 
            pdsquestion_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        subject_id,
        Examname,
        question_count,
        dsquestion_count,
        exam_start_time,
        exam_end_time,
        pmulquestion_count,
        pdsquestion_count,
        pmulquestion_id,  // Comma-separated values
        pdsquestion_id    // Comma-separated values
    ];

    // Execute SQL query
    con.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error inserting task', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.status(200).json({ message: 'Task assigned successfully', data: result });
    });
});

app.get(`/getnewmcq_question/:mcquesid`, (req, res) => {
    const McqIds = req.params.mcquesid;
    
    // Split the string into an array and trim any whitespace around the IDs
    const IdsArray = McqIds.split(',').map(prev => prev.trim());

    // Construct placeholders dynamically based on the number of IDs
    const placeholders = IdsArray.map(() => '?').join(',');  // Creates a string like '?, ?, ?'

    // Construct the SQL query with placeholders
    const sql = `SELECT * FROM questions WHERE question_id IN (${placeholders})`;

    // Execute the query with the actual values (IdsArray) passed as parameters
    con.query(sql, IdsArray, (err, results) => {
        if (err) {
            console.error("Error while fetching new MCQ questions:", err);
            return res.status(500).json({ message: "Error occurred while getting new MCQ questions" });
        }

        console.log(results, "Fetched MCQ Questions");
        return res.status(200).json(results);  // Return the questions as JSON response
    });
});

app.get(`/getnewds_question/:dsquesid`,(req,res)=>{
    const DsQuesId=req.params.dsquesid;

    const IdsArray=DsQuesId.split(',').map(prev=>prev.trim())

    const placeholders=IdsArray.map(()=>'?').join(',')

    const sql=`select * from dsquestion where dsq_id in(${placeholders})`
    con.query(sql,IdsArray,(err,results)=>{
        if(err){
            console.error("error getting while fetching the data ",err)
            return res.status(500).json({message:"error getting the data"})
        }
        console.log(results,"yessssssss")
        return res.status(200).json(results)
    })
})



app.get('/getSpecificQuestions', (req, res) => {
    const { ids } = req.query;

    if (!ids) {
        return res.status(400).json({ error: "IDs are required" });
    }

    // Split the IDs into an array and escape single quotes for SQL injection prevention
    const idsArray = ids.split(',').map(id => `'${id.trim()}'`).join(',');

    // Construct the SQL query with placeholders for the IDs
    const sql = `SELECT * FROM questions WHERE question_id IN (${idsArray})`;

    // Execute the query
    con.query(sql, (err, results) => {
        if (err) {
            console.error("Fetching specific questions error:", err);
            return res.status(500).json({ error: "Failed to fetch specific questions" });
        }

        console.log("Successfully fetched specific questions");
        res.status(200).json(results);
    });
});

app.get('/getSpecificDescriptiveQuestions', (req, res) => {
    const { ids } = req.query;

    if (!ids) {
        return res.status(400).json({ error: "IDs are required" });
    }

    // Split the IDs into an array and escape single quotes for SQL injection prevention
    const idsArray = ids.split(',').map(id => `'${id.trim()}'`).join(',');

    // Construct the SQL query with placeholders for the IDs
    const sql = `SELECT * FROM dsquestion WHERE dsq_id IN (${idsArray})`;

    // Execute the query
    con.query(sql, (err, results) => {
        if (err) {
            console.error("Fetching specific questions error:", err);
            return res.status(500).json({ error: "Failed to fetch specific questions" });
        }

        console.log("Successfully fetched specific questions");
        res.status(200).json(results);
    });
});

app.get('/getexamdetails',(req,res)=>{

    const sql="select * from Atask1";

    con.query(sql,(err,result)=>{
        if(err){
            console.error("error geting taskdetails",err)
            return res.status(500).json({messsge:"error geting task details"})
        }
        console.log("sucessfully getting task details")
        return res.status(200).json(result)
    })
})
// Routes
app.post('/assignExam', (req, res) => {
    const { assignments, email } = req.body;

    // Validate assignments array
    if (!Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({ error: 'Invalid data for assignments.' });
    }

    // Validate email array
    if (!email || !Array.isArray(email) || email.length === 0) {
        return res.status(400).json({ error: 'Invalid data for email.' });
    }
    const mailOptions = {
        from: 'practicetest3333@gmail.com', // Sender address
        subject: 'Exam Assignment Notification',
        text: 'You have been assigned an exam. Please follow this link: http://localhost:3000/studentlogin' 
    };

    // Check for duplicate assignments in the database
    const sqlCheckDuplicates = 'SELECT student_id, task_id FROM exam WHERE (student_id, task_id) IN (?)';
    const valuesToCheck = assignments.map(item => [item.student_id, item.task_id]);

    con.query(sqlCheckDuplicates, [valuesToCheck], (error, results) => {
        if (error) {
            console.error('Error checking duplicates:', error);
            return res.status(500).json({ error: 'Failed to check duplicates.' });
        }

        // If duplicates are found, return them
        if (results.length > 0) {
            const duplicateStudentIds = results.map(item => item.student_id);
            return res.status(400).json({
                error: 'Duplicate entries found.',
                duplicates: duplicateStudentIds
            });
        }

        // Prepare values for insertion into the database
        const sqlInsert = 'INSERT INTO exam (student_id, task_id) VALUES ?';
        const values = assignments.map(item => [item.student_id, item.task_id]);

        // Perform the insert query
        con.query(sqlInsert, [values], (error, results) => {
            if (error) {
                console.error('Error inserting data:', error);
                return res.status(500).json({ error: 'Failed to assign exams.' });
            }

            // Send an email to each recipient in the 'email' array
            email.forEach((recipientEmail) => {
                const personalizedMailOptions = {
                    ...mailOptions,
                    to: recipientEmail, // Recipient's email address
                };

                transporter.sendMail(personalizedMailOptions, (error, info) => {
                    if (error) {
                        console.error('Error sending email:', error);
                    } else {
                        console.log(`Email sent to ${recipientEmail}: ${info.response}`);
                    }
                });
            });

            res.status(200).json({ message: 'Exams assigned successfully and emails sent.' });
        });
    });
});




app.get('/getDetailedTasks1', (req, res) => {
    const studentId = req.query.student_id;
  
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }
  
    const query = `
      SELECT 
        e.status,
        e.task_id,
        a.exa_name,
        a.subject_id,
        a.question_count,
        a.exam_start_time,
        a.exam_end_time,
        a.dsquestion_count,
        a.pmulquestion_count,
        a.pdsquestion_count,
        a.pmulquestion_id,
        a.pdsquestion_id,
        a.mcq_question_id,
        a.dsq_question_id
      FROM exam e
      JOIN Atask1 a ON e.task_id = a.task_id
      WHERE e.student_id = ?
    `;
  
    con.query(query, [studentId], (err, results) => {
      if (err) {
        console.error('Error fetching tasks:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(results);
    });
  });
  app.get(`/particulargetDetailedTasks1/:student_id`, (req, res) => {
    const studentId = req.params.student_id;
  
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }
  
    const query = `
      SELECT 
        e.task_id,
        a.exa_name,
        a.subject_id,
        a.question_count,
        a.exam_start_time,
        a.exam_end_time,
        a.dsquestion_count,
        a.pmulquestion_count,
        a.pdsquestion_count,
        a.pmulquestion_id,
        a.pdsquestion_id
      FROM exam e
      JOIN Atask1 a ON e.task_id = a.task_id
      WHERE e.student_id = ?
    `;
  
    con.query(query, [studentId], (err, results) => {
      if (err) {
        console.error('Error fetching tasks:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(results);
    });
  });

  app.get(`/particularresult/:studentid`,(req,res)=>{
    const student_id=req.params.studentid;
    const sql ="select * from exam_results where studentId=?";
    con.query(sql,[student_id],(err,result)=>{
        if(err){
            console.error("error occured while fetching the results",err)
            return res.status(500).json({message:"error occured while getting particular student results"})
        }
        else{
            console.log("sucessfully getting particular student results")
            return res.status(200).json(result)
        }

    })
  })

  app.get('/getexamstudentstatus/:taskid',(req,res)=>{
    const Task_Id=req.params.taskid;
    const sqlquery = `
    SELECT 
        e.student_id,
        e.task_id,
        e.exam_id,
        e.status,
        e.stud_ques_paper,
        s.student_id AS student_id,   -- Ensure unique aliases for student_id
        s.student_name,
        s.email,
        s.phone_number,
        t.exa_name,
        t.exam_start_time,
        t.exam_end_time,
        t.question_count ,
        er.TotalMarks,
        er.descriptiveMarks,
        er.descriptivequestiontotalmarks
    FROM 
        exam e
    INNER JOIN 
        student1 s ON e.student_id = s.student_id
    INNER JOIN 
        Atask1 t ON e.task_id = t.task_id
    LEFT JOIN 
        exam_results er ON e.student_id = er.studentId AND e.task_id = er.Task_Id  -- Join with exam_results
    WHERE 
        e.task_id = ?;
`;


    con.query(sqlquery,[Task_Id],(err,results)=>{
        if(err){
            console.error("erro getting examstatus data",err);
            return res.status(500).json({message:"erro getting examstatus data"})
        }
        console.log("sucessfully fetching the examstatus of students details")
        return res.status(200).json(results)
    })
  })

  app.delete('/deleteexamrecord/:examid', (req, res) => {
    const Exam_id = req.params.examid;

    
    const sql = "DELETE FROM exam WHERE exam_id = ?";

    con.query(sql, [Exam_id], (err, results) => {
        if (err) {
            console.error("Error occurred while deleting the exam record:", err);
            return res.status(500).json({ message: "Error occurred while deleting the exam record" });
        }

        if (results.affectedRows === 0) {
            // If no rows were affected, meaning no matching exam_id was found
            return res.status(404).json({ message: "No exam record found with the provided exam_id" });
        }

        console.log("Successfully deleted the exam record");
        return res.status(200).json({ message: "Successfully deleted the exam record" });
    });
});

  app.get('/getcompletetaskdetails', (req, res) => {
    
    const query = `
      SELECT 
        
             student1.student_id,student1.student_name,Atask1.task_id,exam.exam_id,exam.status,
             Atask1.exa_name,Atask1.question_count,Atask1.dsquestion_count,Atask1.dsquestion_count,Atask1.pmulquestion_count,Atask1.pdsquestion_count,Atask1.pmulquestion_id,Atask1.pdsquestion_id, Atask1.subject_id, Atask1.exam_start_time, Atask1.exam_end_time
      FROM exam
      JOIN student1 ON exam.student_id = student1.student_id
      JOIN Atask1 ON exam.task_id = Atask1.task_id
    `;
  
  
    con.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching detailed tasks:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(results);
    });
  });

// Route to update a task
const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
// Route to update a task
app.put('/updateTask', (req, res) => {
    const { task_id, exam_name, exam_start_time, exam_end_time } = req.body;

    const formattedStartTime = formatDateTime(exam_start_time);
    const formattedEndTime = formatDateTime(exam_end_time);

    const query = `
        UPDATE Atask1
        SET exa_name = ?, exam_start_time = ?, exam_end_time = ?
        WHERE task_id = ?
    `;

    con.query(query, [exam_name, formattedStartTime, formattedEndTime, task_id], (error, results) => {
        if (error) {
            console.error('Error updating task:', error);
            return res.status(500).send('Error updating task');
        }
        res.send('Task updated successfully');
    });
});
// Route to delete a task
app.delete('/deleteTask', (req, res) => {
    const taskId = req.query.task_id;

    
    const deleteExamQuery = 'DELETE FROM exam WHERE task_id = ?';
    con.query(deleteExamQuery, [taskId], (error, results) => {
        if (error) {
            console.error('Error deleting exam records:', error);
            return res.status(500).json({ message: "Error occurred while deleting exam details" });
        }

        // Then, delete the task from the `Atask1` table
        const deleteTaskQuery = 'DELETE FROM Atask1 WHERE task_id = ?';
        con.query(deleteTaskQuery, [taskId], (error, results) => {
            if (error) {
                console.error('Error deleting task:', error);
                return res.status(500).json({ message: "Error occurred while deleting task details" });
            }

            // Return success response
            res.json({ message: "Task and related exam records deleted successfully", results });
        });
    });
});
/*
app.post('/assignstudents', (req, res) => {
    const { evaluator_id, student_ids } = req.body;

    if (!evaluator_id || !student_ids || !Array.isArray(student_ids)) {
        return res.status(400).json({ message: 'Invalid input' });
    }

    // Prepare SQL query
    const query = 'INSERT INTO evalassignstud (evaluator_id, student_id) VALUES ?';
    const values = student_ids.map(student_id => [evaluator_id, student_id]);

    con.query(query, [values], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        res.status(200).json({ message: 'Students assigned successfully' });
    });
});

*/

app.post('/assignstudents', (req, res) => {
    const { evaluator_id, student_ids, examName } = req.body;

    // Check if all required conditions are met
    if (!(evaluator_id && student_ids && Array.isArray(student_ids))) {
        return res.status(400).json({ message: 'Invalid input' });
    }

    // Begin transaction
    con.beginTransaction(err => {
        if (err) {
            return res.status(500).json({ message: 'Transaction error', error: err });
        }

        // Prepare SQL query to check for duplicates
        const duplicateCheckQuery = `
            SELECT COUNT(*) AS count 
            FROM evalassignstud 
            WHERE evaluator_id = ? AND student_id IN (?) AND exam_name = ?
        `;

        // Execute duplicate check
        con.query(duplicateCheckQuery, [evaluator_id, student_ids, examName], (error, results) => {
            if (error) {
                return con.rollback(() => {
                    console.error('Error checking for duplicates:', error);
                    res.status(500).json({ message: 'Database error', error });
                });
            }

            // Check if any duplicate entries exist
            const count = results[0].count;
            if (count > 0) {
                return con.rollback(() => {
                    return res.status(409).json({ message: 'Students already assigned to this evaluator for the same exam.' });
                });
            }

            // Prepare SQL query for insertion
            const insertQuery = 'INSERT INTO evalassignstud (evaluator_id, student_id, exam_name) VALUES ?';
            const values = student_ids.map(student_Id => [evaluator_id, student_Id, examName]);

            // Execute insertion
            con.query(insertQuery, [values], (error, results) => {
                if (error) {
                    return con.rollback(() => {
                        console.error('Error inserting data:', error);
                        res.status(500).json({ message: 'Database error', error });
                    });
                }

                // Commit transaction
                con.commit(err => {
                    if (err) {
                        return con.rollback(() => {
                            console.error('Transaction commit error:', err);
                            res.status(500).json({ message: 'Failed to assign students', error: err });
                        });
                    }

                    res.status(200).json({ message: 'Students assigned successfully' });
                });
            });
        });
    });
});




app.get(`/assignstudentdetails`, (req, res) => {
    const evaluatorId = req.query.evaluatorid;  // You should use req.query to get the query parameter
    console.log("Fetching data for evaluatorId:", evaluatorId);
    
    // Define the SQL query
    const sql = `SELECT a.assignstude_id, a.evaluator_id, a.student_id, s.student_name, e.evaluator_name
                 FROM evalassignstud a
                 JOIN student1 s ON a.student_id = s.student_id
                 JOIN evaluator e ON a.evaluator_id = e.evaluator_id
               `; // Placeholder for evaluatorId

    // Format the query by replacing the placeholder with the actual evaluatorId
    const formattedSql = mysql.format(sql);

    // Log the formatted SQL query
    console.log("Formatted SQL Query:", formattedSql);

    // Run the query with the parameter
    con.query(formattedSql, (err, results) => {
        if (err) {
            console.error('Error fetching detailed student assignments:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(results);
    });
});


app.get('/evaluatorstudentdetails',(req,res)=>{
   
    const sql=`SELECT a.assignstude_id, a.evaluator_id, a.student_id, s.student_name, e.evaluator_name
                 FROM evalassignstud a
                 JOIN student1 s ON a.student_id = s.student_id
                 JOIN evaluator e ON a.evaluator_id = e.evaluator_id`
    con.query(sql,(err,results)=>{
        if(err){
            console.error("error getting evaluator assigned student details",err)
            return res.status(500).json({message:"error getting evaluator assigned student details"})
        }
        res.json(results)
    })
})


app.delete('/deleteassignstudent/:assignstudentid',(req,res)=>{
    const assignstudentId=req.params.assignstudentid;
    const sql="delete from evalassignstud where assignstude_id=?";
    con.query(sql,[assignstudentId],(err,results)=>{
        if(err){
            console.error("delete the record error occured",err)
            return res.status(500).json({message:"assigning the student error occured"});
        }
        return res.status(200).json(results)
    })
})

app.get('/questions', (req, res) => {
    con.query('SELECT * FROM dsquestion', (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});



app.get('/examattemptedstudentdetails/:selectedexamid', (req, res) => {
    const selectedexamId = req.params.selectedexamid;
    const sql = `
        SELECT e.*, s.student_name
        FROM exam e
        JOIN student1 s ON e.student_id = s.student_id
        WHERE e.task_id = ? AND e.status = 'attempted'
    `;

    con.query(sql, [selectedexamId], (err, results) => {
        if (err) {
            console.error("Error fetching the exam attempted student details", err);
            return res.status(500).json({ message: "Error fetching the exam attempted student details" });
        }
        console.log("Successfully fetched the exam attempted student details");
        return res.status(200).json(results);
    });
});
app.post('/answersheetupload', upload.single('answerSheet'), (req, res) => {
    const { originalname, filename, path: filePath } = req.file;
    const studentId = req.body.studentId;
    const taskId = req.body.taskId;
    const ExamName = req.body.selectexamname;

    // Check for existing record
    const checkQuery = 'SELECT * FROM scanned_documents1 WHERE student_id = ? AND task_id = ?';
    con.query(checkQuery, [studentId, taskId], (err, results) => {
        if (err) {
            console.error('Error checking for duplicates:', err);
            return res.status(500).json({ message: 'Error checking for duplicates' });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'This student has already uploaded an answer sheet for this exam.' });
        }

        // Count the number of pages in the PDF
        fs.readFile(filePath, (err, data) => {
            if (err) {
                console.error('Error reading PDF file:', err);
                return res.status(500).json({ message: 'Error reading PDF file' });
            }

            pdfParse(data).then(result => {
                const pageCount = result.numpages;

                
                const sql = 'INSERT INTO scanned_documents1 (task_id, student_id, document_path, page_count, exam_name) VALUES (?, ?, ?, ?, ?)';
                con.query(sql, [taskId, studentId, filename, pageCount, ExamName], (err, result) => {
                    if (err) {
                        console.error('Error saving file details to database:', err);
                        return res.status(500).json({ message: 'Error uploading file' });
                    }

                    res.status(200).json({ message: 'File uploaded successfully' });
                });
            }).catch(err => {
                console.error('Error parsing PDF:', err);
                res.status(500).json({ message: 'Error parsing PDF' });
            });
        });
    });
});




app.get('/all-documents', (req, res) => {
    const query = `
        SELECT
            sd.document_id,
            sd.task_id,
            t.exa_name AS exam_name,
            sd.student_id,
            s.student_name,
            sd.document_path,
            sd.created_at,
            sd.page_count
        FROM
            scanned_documents1 sd
        JOIN
            student1 s ON sd.student_id = s.student_id
        JOIN
            Atask1 t ON sd.task_id = t.task_id
    `;

    con.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching all documents:', err);
            return res.status(500).send('Error fetching all documents');
        }
        res.json(results);
    });
});

app.post('/updateExamName', (req, res) => {
    const { task_id, exam_name } = req.body;
    const query = "UPDATE scanned_documents1 SET exam_name = ? WHERE task_id = ?";
    db.query(query, [exam_name, task_id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error updating exam name', error: err });
        }
        res.status(200).json({ message: 'Exam name updated successfully', result });
    });
});


app.delete('/deleteuploadsheet/:documentid', (req, res) => {
    const documentId = req.params.documentid;
    const sql = "DELETE FROM scanned_documents1 WHERE document_id = ?";

    con.query(sql, [documentId], (err, results) => {
        if (err) {
            console.error("Error while deleting the upload sheet", err);
            return res.status(500).json({ message: "Error occurred while deleting the upload sheet" });
        }
        console.log("Successfully deleted the upload sheet");
        return res.status(200).json(results);
    });
});

app.get('/get_pdf_path/:documentid', (req, res) => {
    const documentId = req.params.documentid;

    const sql = "SELECT document_path FROM scanned_documents1 WHERE document_id = ?";

    con.query(sql, [documentId], (err, results) => {
        if (err) {
            console.error("Error occurred while getting document path", err);
            return res.status(500).json({ message: "Error occurred while getting document path" });
        }

        // Check if results are returned
        if (results.length === 0) {
            return res.status(404).json({ message: "Document not found" });
        }

        // Send the document path
        return res.status(200).json(results[0]);
    });
});
app.get('/students-for-evaluator/:evaluatorId', async (req, res) => {
    const evaluatorId = req.params.evaluatorId;
   
        const query = `
            SELECT s.student_id, s.student_name, s.email, s.phone_number, s.date_of_birth, s.student_image,a.exa_name
            FROM student1 s
            JOIN exam e ON s.student_id = e.student_id
            JOIN atask1 a ON e.task_id = a.task_id
            WHERE a.subject_id = (SELECT evaluator_subject FROM evaluator WHERE evaluator_id = ?)
            AND e.status = 'attempted';
        `;
        con.query(query,[evaluatorId],(err,results)=>{
            if (err) {
                console.error("Error occurred while getting document path", err);
                return res.status(500).json({ message: "Error occurred while getting document path" });
            }
            console.log("Successfully deleted the upload sheet");
            return res.status(200).json(results);
    
        })
});

app.get('/gettingevaluatordetails',(req,res)=>{
    const sql="select * from evalassignstud";
    con.query(sql,(err,results)=>{
        if(err){
            console.error("error getting the records of evalassignstudents",err)
            return res.status(500).json({message:"error getting the records of evalassignstudents"})
        }
        console.log("sucessfully getting evalassignstudentdetails")
        return res.status(200).json(results)
    })
})
app.get('/evaluatorassignedcandidatelist/:evaluatorId', (req, res) => {
    const evaluatorId = req.params.evaluatorId;
   

    const queryStudents = `
        SELECT *
        FROM evalassignstud
        WHERE evaluator_id = ?
    `;

    con.query(queryStudents, [evaluatorId], (err, students) => {
        if (err) {
            console.error("error while evaluatorassignedcandidatelist occured",err);
            return res.status(500).json({ error: 'Database error' });
        }

        const uploadCount = students.length;
        const evaluatedCount = students.filter(student => student.status === 'Approved').length;

        res.json({
            students,
            uploadCount,
            evaluatedCount
        });
    });
});


app.get('/correctionpaper/:studentId/:examname', (req, res) => {
    const { studentId, examname } = req.params;

    const query = `
        SELECT evaluatedpaper,uploadedquestiondata
        FROM evalassignstud 
        WHERE student_id = ? AND exam_name = ? and status="Approved"
    `;

    con.query(query, [studentId, examname], (err, results) => {
        if (err) {
            console.error("Error fetching evaluated paper:", err);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log("sucessfully getting the corrrection paper pdf")
        return res.status(200).json(results);
    });
});



app.get('/Evaluatedsheetdetails', (req, res) => {
    const sql = "SELECT * FROM evalassignstud";

    con.query(sql, (err, results) => {
        if (err) {
            console.error("Error occurred while getting evaluated sheet count",err);
            return res.status(500).json({ message: "Error occurred while getting evaluated sheet count" });
        }
        console.log("Successfully getting evaluated answer sheet details");
        const uploadSheets = results.length;
        const evaluatedSheets = results.filter(res => res.status === "Approved").length;
        console.log("hee",typeof(uploadSheets))
        return res.status(200).json({ results, uploadSheets, evaluatedSheets });
    });
});



app.get('/getdescriptivequestions/:studentid/:examname', (req, res) => {
    const studentId = req.params.studentid;
    const Exam_Name=req.params.examname
    
   /* const sql = `SELECT 
    e.student_id,
    e.evaluator_id,
    e.exam_name,
    er.attempted_descriptive_questions
FROM 
    evalassignstud e
 JOIN 
    exam_results er ON e.student_id = er.studentId AND e.exam_name = er.examname
WHERE 
    e.student_id = ? AND e.exam_name = ? AND e.status = 'in process';`;
    */


    const sql = `SELECT 
    e.student_id,
    e.evaluator_id,
    e.exam_name,
    er.attempted_descriptive_questions
FROM 
    evalassignstud e
 JOIN 
    exam_results er ON e.student_id = er.studentId AND e.exam_name = er.examname
WHERE 
    e.student_id = ? AND e.exam_name = ?;`


    con.query(sql, [studentId, Exam_Name], (err, results) => {

        if (err) {
            console.log("Error occurred while getting the descriptive questions:", err);
            return res.status(500).json({ message: "Error occurred while getting the descriptive questions" });
        }
        console.log("sucessfully getting descriptivequestions")
        return res.status(200).json(results);
        console.log("hiiiii",results)
    });
});
{/* 
app.get('/getdescriptivequestions/:studentid', (req, res) => {
    const studentId = req.params.studentid;
    const sql = "SELECT * FROM exam_results WHERE studentId = ?";
    
    con.query(sql, [studentId], (err, results) => {
        if (err) {
            console.error("Error occurred while getting the descriptive questions:", err);
            return res.status(500).json({ message: "Error occurred while getting the descriptive questions" });
        }
        
        // Parse the attempted_descriptive_questions if it's a string
        results.forEach(result => {
            result.attempted_descriptive_questions = JSON.parse(result.attempted_descriptive_questions);
        });

        return res.status(200).json(results);
    });
});
*/}


app.get('/gettingpadfurl/:studentId/:examname', (req, res) => {
    const studentId = req.params.studentId;
    const examName = req.params.examname;

    const sql = `select document_path from scanned_documents1 where student_id =? and exam_name=?`
   

    console.log("Executing SQL:", sql, "with values:", studentId, examName);

    con.query(sql, [studentId, examName], (error, results) => {
        if (error) {
            console.error("Error getting document path", error);
            return res.status(500).json({ error: 'Database query error' });
        }
        
        if (results.length > 0) {
            console.log("Document path found:", results[0].document_path);
            res.json(results);
        } else {
            console.log("No document found for given parameters.");
            res.json([]);
        }
    });
});

app.post('/submit-evaluation', upload.single('evaluatedPaper'), (req, res) => {
    const { totalmarks, examname, studentid, status, submissiontime,updatedQuestions } = req.body;
    const filePath = req.file.filename; // This will be the path without a specific folder
    console.log("filename",filePath)
    console.log("updatedQuestions",)

    // Database update logic remains the same
    const Sql = "UPDATE exam_results SET descriptiveMarks=? WHERE studentId=? AND examname=?";
    con.query(Sql, [totalmarks, studentid, examname], (err) => {
        if (err) {
            console.error("Error adding the descriptive exam results", err);
            return res.status(500).json({ message: "Error adding the descriptive marks" });
        }

        const updateSql = "UPDATE evalassignstud SET status=?, evaluated_date=?, evaluatedpaper=?,uploadedquestiondata=? WHERE student_id=? AND exam_name=?";
        con.query(updateSql, [status, submissiontime, filePath,updatedQuestions, studentid, examname], (err) => {
            if (err) {
                console.error("Error updating the status record", err);
                return res.status(500).json({ message: "Error updating the status record" });
            }

            // Send the file path back to the client
            return res.status(200).json({ message: "Successfully submitted", evaluatedPaperPath: filePath });
        });
    });
});


app.get('/getresultsdetailsbasedonexam/:selectedexam',(req,res)=>{
    const selectedExam=req.params.selectedexam;
    console.log(selectedExam)
    const sql="select * from exam_results where Task_Id=?";
    con.query(sql,[selectedExam],(err,results)=>{
        if(err){
            console.error("error getting while stored the seltedexam results",err);
            return res.status(500).json({message:"error getting while stored the selected examresults"})
        }
        console.log("sucessfully get the selected exam results")
        return res.status(200).json(results)
    })
})



// Serve uploaded images statically
app.use('/uploads', express.static('uploads'));
// const PORT = process.env.PORT || 3004;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
//    // document.write("helllo")
// });
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
   // document.write("helllo")
});

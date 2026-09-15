"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var bcrypt = require("bcrypt");
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var BCRYPT_ROUNDS = 12;
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var passwordHash, users, createdUsers, _i, users_1, u, user, courseTemplates, _a, courseTemplates_1, t, existing, course, _b, users_2, u;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('🌱 Seeding database...');
                    return [4 /*yield*/, bcrypt.hash('Password123!', BCRYPT_ROUNDS)];
                case 1:
                    passwordHash = _c.sent();
                    users = [
                        { email: 'system.admin@mor.gov.et', firstName: 'Sami', lastName: 'Admin', role: client_1.RoleName.SYSTEM_ADMIN },
                        { email: 'training.admin@mor.gov.et', firstName: 'Aisha', lastName: 'Mohammed', role: client_1.RoleName.TRAINING_ADMIN },
                        { email: 'owner@mor.gov.et', firstName: 'Bereket', lastName: 'Tadesse', role: client_1.RoleName.COURSE_OWNER },
                        { email: 'approver@mor.gov.et', firstName: 'Selam', lastName: 'Hailu', role: client_1.RoleName.CONTENT_APPROVER },
                        { email: 'trainer@mor.gov.et', firstName: 'Kebede', lastName: 'Alem', role: client_1.RoleName.TRAINER },
                        { email: 'learner1@mor.gov.et', firstName: 'Meron', lastName: 'Kassa', role: client_1.RoleName.LEARNER },
                        { email: 'learner2@mor.gov.et', firstName: 'Dawit', lastName: 'Tesfaye', role: client_1.RoleName.LEARNER },
                        { email: 'learner3@mor.gov.et', firstName: 'Hanna', lastName: 'Girmay', role: client_1.RoleName.LEARNER },
                        { email: 'learner4@mor.gov.et', firstName: 'Yonatan', lastName: 'Wolde', role: client_1.RoleName.LEARNER },
                        { email: 'learner5@mor.gov.et', firstName: 'Liya', lastName: 'Birhan', role: client_1.RoleName.LEARNER },
                    ];
                    createdUsers = {};
                    _i = 0, users_1 = users;
                    _c.label = 2;
                case 2:
                    if (!(_i < users_1.length)) return [3 /*break*/, 6];
                    u = users_1[_i];
                    return [4 /*yield*/, prisma.user.findUnique({ where: { email: u.email } })];
                case 3:
                    user = _c.sent();
                    if (user) {
                        console.log("  \u2022 ".concat(u.email, " already exists \u2014 skipping"));
                        createdUsers[u.role] = user.id;
                        return [3 /*break*/, 5];
                    }
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: u.email,
                                password: passwordHash,
                                firstName: u.firstName,
                                lastName: u.lastName,
                                isActive: true,
                                roles: {
                                    create: { role: u.role },
                                },
                            },
                        })];
                case 4:
                    user = _c.sent();
                    createdUsers[u.role] = user.id;
                    console.log("  \u2713 ".concat(u.email, " (").concat(u.role, ")"));
                    _c.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6:
                    courseTemplates = [
                        {
                            code: 'CS101',
                            titleEn: 'Computer Basics',
                            titleAm: 'የኮምፒውተር መሰረታዊ ትምህርት',
                            descriptionEn: 'Foundational computer literacy for Ministry staff.',
                            descriptionAm: 'ለሚኒስቴሩ ሰራተኞች መሰረታዊ የኮምፒውተር እውቀት።',
                            estimatedHours: 20,
                        },
                        {
                            code: 'EXCEL101',
                            titleEn: 'Advanced Excel Skills',
                            titleAm: 'የላቀ የExcel ችሎታ',
                            descriptionEn: 'Spreadsheet mastery: formulas, pivots, dashboards.',
                            descriptionAm: 'የስፕሬድሼት ክህሎት፡ ቀመሮች፣ ፒቮት፣ ዳሽቦርዶች።',
                            estimatedHours: 30,
                        },
                        {
                            code: 'HRM101',
                            titleEn: 'HR Management Fundamentals',
                            titleAm: 'የሰው ሃይል አስተዳደር መሰረታዊ',
                            descriptionEn: 'Core HR principles and best practices.',
                            descriptionAm: 'መሰረታዊ የHR መርሆች እና ምርጥ ተሞክሮዎች።',
                            estimatedHours: 25,
                        },
                        {
                            code: 'ETHICS101',
                            titleEn: 'Public Sector Ethics',
                            titleAm: 'የመንግስት ሴክተር ስነምግባር',
                            descriptionEn: 'Ethical conduct and integrity in public service.',
                            descriptionAm: 'በህዝብ አገልግሎት ውስጥ ስነምግባር እና ታማኝነት።',
                            estimatedHours: 15,
                        },
                        {
                            code: 'CYBER101',
                            titleEn: 'Cybersecurity Awareness',
                            titleAm: 'የሳይበር ደህንነት ግንዛቤ',
                            descriptionEn: 'Protecting ministry data and systems from threats.',
                            descriptionAm: 'የሚኒስቴር መረጃዎችን እና ስርዓቶችን ከአደጋዎች መጠበቅ።',
                            estimatedHours: 18,
                        },
                        {
                            code: 'PROJ101',
                            titleEn: 'Project Management Essentials',
                            titleAm: 'የፕሮጀክት አስተዳደር መሰረታዊ',
                            descriptionEn: 'Planning, executing, and monitoring projects.',
                            descriptionAm: 'ፕሮጀክቶችን ማቀድ፣ ማስፈጸም እና መከታተል።',
                            estimatedHours: 40,
                        },
                    ];
                    _a = 0, courseTemplates_1 = courseTemplates;
                    _c.label = 7;
                case 7:
                    if (!(_a < courseTemplates_1.length)) return [3 /*break*/, 11];
                    t = courseTemplates_1[_a];
                    return [4 /*yield*/, prisma.course.findUnique({ where: { code: t.code } })];
                case 8:
                    existing = _c.sent();
                    if (existing) {
                        console.log("  \u2022 Course ".concat(t.code, " already exists \u2014 skipping"));
                        return [3 /*break*/, 10];
                    }
                    return [4 /*yield*/, prisma.course.create({
                            data: {
                                code: t.code,
                                titleAm: t.titleAm,
                                titleEn: t.titleEn,
                                descriptionAm: t.descriptionAm,
                                descriptionEn: t.descriptionEn,
                                estimatedHours: t.estimatedHours,
                                status: 'DRAFT',
                                owners: {
                                    create: {
                                        userId: createdUsers[client_1.RoleName.COURSE_OWNER],
                                    },
                                },
                            },
                        })];
                case 9:
                    course = _c.sent();
                    console.log("  \u2713 Course ".concat(course.code, " (").concat({ en: t.titleEn, am: t.titleAm }, ")"));
                    _c.label = 10;
                case 10:
                    _a++;
                    return [3 /*break*/, 7];
                case 11:
                    console.log('✅ Seed complete!');
                    console.log('\nDemo accounts (password: Password123!):');
                    for (_b = 0, users_2 = users; _b < users_2.length; _b++) {
                        u = users_2[_b];
                        console.log("  ".concat(u.email, " \u2192 ").concat(u.role));
                    }
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });

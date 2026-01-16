# Model Flagging
model was inpisre by the paper
Tuesday, 28 March 2000
Detecting excessive similarity in answers on multiple choice exams
George O. Wesolowsky, Michael G. De Groote School of Business, McMaster University,
Hamilton, Ontario, Canada

and works as follows only allows to check if a piar of students have a likely hood of cheating.  

$$ p= \frac{S_v * S_s}{S_v+S_s} * (\frac{s_1 +s_2}{s_{av}}) * \sqrt{(Q_{av1}*Q_{av2})^2}$$

$S_v$ = Simulatiry of the varaints between both students  
$S_s$ = Simularity of the student responses  
$s_1$ = first students test score percentage  
$s_2$ = second students test score percentage     
$s_{av}$ = class average score percentage  
$Q_{av1}$ = first students variant question average biserial  
$Q_{av2}$ = second students variant question average biserial

it works by essential calcuating a value that tries to be as close to 1 as possible. the closer to 1 it is the more likely the student has cheated on the exam.

we take a wieghted simularity of both the students answers but also thier varaint simularity. this allows us to get a baseline coupled with the biserial whether the students are picking questions non randomly, then get a score calculation based on the average of the class. the values are usaully pretty small unless the score is really big or thier is high simularity on both simularity metrics. 

what this means that two of three the requirements from the simularity, student score or bieserils need to be met to get a number large enough to be above .7 which would be the minuim value to flag. a highly likely pair would be around .8 or higher.

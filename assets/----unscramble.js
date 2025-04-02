let interval;
let once = 1;
var retryCount = 0;


const element = document.getElementById('scramble');
var temp_element = element.innerText;
const email = 'kahramankostas@gmail.com';
const email_length = email.length;

const randomInt = (max) => Math.floor(Math.random() * max);
const randomFromArray = (array) => array[randomInt(array.length)];

const scrambleText = (text,retryCount) => {
  const prev = email.split("").slice(0,retryCount).join("")
  const chars = email.split("").slice(retryCount+1,email_length);
  rest = chars.map((x) => (randomInt(3) > 1 ? randomFromArray(chars) : x)).join("");
  return_email = prev.concat(rest);
  return return_email
};

element.addEventListener("mouseenter", () => {

  if (retryCount < email_length){
      interval = setInterval(
        () => {
                if(retryCount > email_length){
                  element.innerText = email;
                  element.href = "mailto:kahramankostas@gmail.com";
                 }
                else{
                  element.innerText = scrambleText(email,retryCount);
                  retryCount++;
              }

              },
           20
      );

  }

});

element.addEventListener('mouseleave', () => {
  element.innerText = '';
  retryCount = 0;
  clearInterval(interval);
});



create table PhoneNumbers (
    userid int,
    PhoneNumber int,
    country text, 
    countryCode int,
    codeSent int default '0',
    isVerified int default '0',
    notification text,
    code int
)
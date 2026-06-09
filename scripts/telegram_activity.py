"""Script for automatically fetching the last activity of Telegram channels.
The script takes a csv file as input, where one column contains Telegram channel URLs.
It then uses the Telegram API to fetch the date of the last message for each channel
and writes this information to a new csv file"""

import argparse as ap
from asyncio import new_event_loop, set_event_loop
from os import getenv
from time import sleep
from urllib.parse import urlparse

import pandas as pd
from dotenv import load_dotenv
from numpy import nan
from telethon.errors import FloodWaitError, UsernameNotOccupiedError
from telethon.sync import TelegramClient

arg_parser = ap.ArgumentParser("lateaf", description="Last Telegram activity finder")
arg_parser.add_argument("in_file", help="input csv")
arg_parser.add_argument(
    "-c", "--column", help="Index of column to use", type=int, default=-1
)
arg_parser.add_argument("out_file", help="Where to write the file")


def is_empty_or_na(value):
    "Check whether a value is empty or NaN"
    return pd.isna(value) or value == ""


def load_data(in_pth):
    "Ingest data from csv file and return as pandas dataframe"
    df = pd.read_csv(
        in_pth, delimiter=",", escapechar="\\", encoding="utf-8", header=0, dtype=str
    )
    return df


def telegram_activity(telegram_api_id, telegram_api_hash, channels):
    "Fetch the last activity of Telegram channels and their availability"
    last_active = []
    availability = []
    hit_rate_limit = False
    with TelegramClient("session_name", telegram_api_id, telegram_api_hash) as client:
        for channel in channels:
            # May be the case that the data can not be processed in reasonable time
            # Therefore just write empty values
            if channel is nan:
                last_active.append("")
                availability.append("")
                continue
            channel = clean_channel_url(channel)
            if hit_rate_limit or is_empty_or_na(channel):
                last_active.append("")
                availability.append("")
                continue
            try:
                while True:
                    try:
                        input_entity = client.get_input_entity(channel)
                        message = client.get_messages(input_entity, limit=1)[0]
                        message_date = message.date
                        last_active.append(message_date)
                        availability.append("available")
                        break
                    except FloodWaitError as exc:
                        if exc.seconds > 3600:
                            hit_rate_limit = True
                            print(
                                f"Wait time of {exc.seconds/3600.0} hours, "
                                "skipping remaining channels"
                            )
                            last_active.append("")
                            availability.append("")
                        else:
                            print(f"Hit rate limit, sleeping for {exc.seconds} seconds")
                            sleep(exc.seconds)
            except UsernameNotOccupiedError:
                last_active.append("")
                availability.append("missing")
            except Exception as exc:  # pylint: disable=broad-except
                last_active.append("")
                availability.append("")
                print(f"Error fetching data for channel {channel}: {exc}")
    return last_active, availability


def clean_channel_url(channel):
    "Clean the Telegram channel URL to extract the channel name"
    channel = urlparse(channel).path
    channel_parts = channel.split("/")
    if len(channel_parts) > 2 and channel_parts[1] == "s":
        channel_parts.pop(1)
    channel = "/".join(channel_parts)
    return channel


if __name__ == "__main__":
    args = arg_parser.parse_args()
    load_dotenv()
    api_id = getenv("TELEGRAM_API_ID")
    api_hash = getenv("TELEGRAM_API_HASH")
    in_df = load_data(args.in_file)
    loop = new_event_loop()
    set_event_loop(loop)
    last_active_list, availability_list = telegram_activity(
        telegram_api_id=api_id,
        telegram_api_hash=api_hash,
        channels=list(in_df.iloc[:, args.column]),
    )
    new_data = pd.DataFrame.from_dict(
        {
            "telegram_last_active": last_active_list,
            "telegram_availability": availability_list,
        }
    )
    print(new_data.head())
    combined = pd.concat([in_df, new_data], axis=1)
    combined.to_csv(args.out_file, index=False)
